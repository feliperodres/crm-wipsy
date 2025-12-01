import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Eye, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AvailabilityScheduleManager } from './AvailabilityScheduleManager';
import { trackCustomEvent } from '@/utils/metaPixel';

export function DemoBookingsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Fetch bookings with full details
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['demo-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_bookings')
        .select(`
          *,
          questionnaire_response:demo_questionnaire_responses(*),
          time_slot:demo_time_slots(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });


  // Update booking status mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, status, notes }: { bookingId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('demo_bookings')
        .update({ status, notes })
        .eq('id', bookingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo-bookings'] });
      toast({ title: 'Reserva actualizada' });
      setSelectedBooking(null);
    },
    onError: (error) => {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'No se pudo actualizar la reserva',
        variant: 'destructive' 
      });
    }
  });

  // Fix timezone mutation
  const fixTimezoneMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');
      
      const { data, error } = await supabase.functions.invoke('fix-demo-slots-timezone', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['demo-bookings'] });
      toast({ 
        title: 'Zona horaria ajustada',
        description: data.message || `Se ajustaron ${data.slots_fixed} slots correctamente`
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'No se pudieron ajustar los horarios',
        variant: 'destructive' 
      });
    }
  });


  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      scheduled: 'default',
      completed: 'secondary',
      cancelled: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Availability Schedule Configuration */}
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule">Horarios Semanales</TabsTrigger>
          <TabsTrigger value="bookings">Reservas</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-6">
          <AvailabilityScheduleManager />
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button 
                onClick={() => fixTimezoneMutation.mutate()}
                disabled={fixTimezoneMutation.isPending}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${fixTimezoneMutation.isPending ? 'animate-spin' : ''}`} />
                Ajustar Zona Horaria de Slots
              </Button>
            </div>
            <BookingsTable 
              bookings={bookings}
              bookingsLoading={bookingsLoading}
              selectedBooking={selectedBooking}
              setSelectedBooking={setSelectedBooking}
              updateBookingMutation={updateBookingMutation}
              getStatusBadge={getStatusBadge}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookingsTable({ 
  bookings, 
  bookingsLoading, 
  selectedBooking, 
  setSelectedBooking, 
  updateBookingMutation,
  getStatusBadge
}: {
  bookings: any;
  bookingsLoading: boolean;
  selectedBooking: any;
  setSelectedBooking: (booking: any) => void;
  updateBookingMutation: any;
  getStatusBadge: (status: string) => JSX.Element;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservas de Demos</CardTitle>
        <CardDescription>Todas las demos agendadas por clientes potenciales</CardDescription>
      </CardHeader>
      <CardContent>
          {bookingsLoading ? (
            <div className="text-center py-8">Cargando reservas...</div>
          ) : bookings?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay reservas todavía</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings?.map((booking: any) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.questionnaire_response?.company_name}
                    </TableCell>
                    <TableCell>{booking.questionnaire_response?.contact_name}</TableCell>
                    <TableCell>{booking.questionnaire_response?.contact_email}</TableCell>
                    <TableCell>{booking.questionnaire_response?.contact_phone}</TableCell>
                    <TableCell>
                      {booking.time_slot?.start_time && 
                        format(parseISO(booking.time_slot.start_time), 'PPp', { locale: es })}
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedBooking(booking)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Detalles de la Reserva</DialogTitle>
                          </DialogHeader>
                          {selectedBooking && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Empresa</Label>
                                  <p className="text-sm">{selectedBooking.questionnaire_response?.company_name}</p>
                                </div>
                                <div>
                                  <Label>Tamaño</Label>
                                  <p className="text-sm">{selectedBooking.questionnaire_response?.company_size}</p>
                                </div>
                                <div>
                                  <Label>Industria</Label>
                                  <p className="text-sm">{selectedBooking.questionnaire_response?.industry}</p>
                                </div>
                                <div>
                                  <Label>País</Label>
                                  <p className="text-sm">{selectedBooking.questionnaire_response?.country}</p>
                                </div>
                                <div>
                                  <Label>Productos</Label>
                                  <p className="text-sm">{selectedBooking.questionnaire_response?.product_count}</p>
                                </div>
                                <div>
                                  <Label>Ventas mensuales</Label>
                                  <p className="text-sm">{selectedBooking.questionnaire_response?.monthly_sales}</p>
                                </div>
                                <div>
                                  <Label>Plataforma</Label>
                                  <p className="text-sm">{selectedBooking.questionnaire_response?.platform}</p>
                                </div>
                                <div>
                                  <Label>Canal principal</Label>
                                  <p className="text-sm">{selectedBooking.questionnaire_response?.main_channel}</p>
                                </div>
                              </div>
                              <div>
                                <Label>Reto principal</Label>
                                <p className="text-sm">{selectedBooking.questionnaire_response?.main_challenge}</p>
                              </div>
                              <div>
                                <Label>Estado</Label>
                                <Select 
                                  value={selectedBooking.status}
                                  onValueChange={(value) => 
                                    updateBookingMutation.mutate({ 
                                      bookingId: selectedBooking.id, 
                                      status: value 
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="scheduled">Programada</SelectItem>
                                    <SelectItem value="completed">Completada</SelectItem>
                                    <SelectItem value="cancelled">Cancelada</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Notas</Label>
                                <Textarea 
                                  defaultValue={selectedBooking.notes || ''}
                                  onBlur={(e) => 
                                    updateBookingMutation.mutate({ 
                                      bookingId: selectedBooking.id, 
                                      status: selectedBooking.status,
                                      notes: e.target.value 
                                    })
                                  }
                                  placeholder="Agregar notas sobre la reunión..."
                                />
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        onClick={() => {
                          const { toast: showToast } = useToast();
                          const response = booking.questionnaire_response;
                          const slot = booking.time_slot;
                          
                          trackCustomEvent('Schedule', {
                            content_name: 'Demo Booking - Confirmed',
                            content_category: 'demo',
                            status: 'confirmed',
                            // Company & contact info
                            company_name: response?.company_name,
                            contact_name: response?.contact_name,
                            contact_email: response?.contact_email,
                            contact_phone: response?.contact_phone,
                            // Business details
                            industry: response?.industry,
                            company_size: response?.company_size,
                            country: response?.country,
                            platform: response?.platform,
                            // Sales metrics
                            monthly_sales: response?.monthly_sales,
                            messages_per_month: response?.messages_per_month,
                            product_count: response?.product_count,
                            product_type: response?.product_type,
                            main_channel: response?.main_channel,
                            main_challenge: response?.main_challenge,
                            // Appointment details
                            appointment_time: slot?.start_time,
                            appointment_timezone: slot?.timezone,
                            booking_id: booking.id,
                            booking_status: booking.status
                          });
                          
                          showToast({
                            title: "Evento enviado a Meta Pixel",
                            description: "Se ha registrado la confirmación de la demo en Meta Pixel",
                          });
                        }}
                        variant="default"
                        size="sm"
                      >
                        📊 Meta
                      </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </CardContent>
    </Card>
  );
}
