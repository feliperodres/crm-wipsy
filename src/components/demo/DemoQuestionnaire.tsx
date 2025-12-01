import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { TimezoneSelector } from './TimezoneSelector';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { trackCustomEvent, trackLead as trackMetaLead } from '@/utils/metaPixel';
import { trackLead as trackTikTokLead, trackContact, identifyUser } from '@/utils/tiktokPixel';

interface QuestionnaireData {
  companyName: string;
  companySize: string;
  productType: string;
  productCount: string;
  country: string;
  industry: string;
  messagesPerMonth: string;
  monthlySales: string;
  platform: string;
  mainChannel: string;
  mainChallenge: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

const steps = [
  {
    id: 'company',
    title: '¿Cómo se llama tu empresa?',
    description: 'Queremos conocer más sobre tu negocio'
  },
  {
    id: 'productType',
    title: '¿Venden un producto físico o productos digitales?',
    description: 'Esto nos ayuda a entender mejor tu modelo de negocio'
  },
  {
    id: 'productCount',
    title: '¿Cuántos productos manejan?',
    description: 'Para configurar el sistema adecuadamente'
  },
  {
    id: 'messagesPerMonth',
    title: '¿Cuántos mensajes sueles recibir al mes?',
    description: 'Para dimensionar el uso de la plataforma'
  },
  {
    id: 'monthlySales',
    title: '¿Cuánto vendes al mes?',
    description: 'Esto nos ayuda a calcular tu ROI potencial'
  },
  {
    id: 'platform',
    title: '¿Usas Shopify u otra plataforma para vender?',
    description: 'Para preparar la integración'
  },
  {
    id: 'contact',
    title: 'Datos de contacto',
    description: 'Para enviarte la confirmación y materiales'
  },
  {
    id: 'timeSlot',
    title: '¡Perfecto! Selecciona tu horario',
    description: 'Escoge el mejor momento para tu demo de 30 minutos'
  },
  {
    id: 'confirmation',
    title: '✅ ¡Reserva confirmada!',
    description: 'Te contactaremos pronto'
  }
];

export function DemoQuestionnaire() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const hasTrackedLeadRef = useRef(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [userTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
    } catch {
      return 'America/Bogota';
    }
  });
  const [bookingComplete, setBookingComplete] = useState(false);
  const queryClient = useQueryClient();
  const [confirmedSlot, setConfirmedSlot] = useState<any | null>(null);
  const [data, setData] = useState<QuestionnaireData>({
    companyName: '',
    companySize: '',
    productType: '',
    productCount: '',
    country: '',
    industry: '',
    messagesPerMonth: '',
    monthlySales: '',
    platform: '',
    mainChannel: '',
    mainChallenge: '',
    contactName: '',
    contactEmail: '',
    contactPhone: ''
  });

  // Track Lead event when component mounts (form initiated)
  useEffect(() => {
    if (!hasTrackedLeadRef.current) {
      trackMetaLead('demo_form_initiated');
      hasTrackedLeadRef.current = true;
    }
  }, []);

  // Fetch available time slots converted to user's timezone
  // RLS policy handles filtering: available, not booked, and future slots only
  const { data: timeSlots, isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ['available-demo-slots', userTimezone],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_time_slots')
        .select('*')
        .eq('is_available', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      // Convert times to user's timezone
      return data?.map(slot => ({
        ...slot,
        userStartTime: toZonedTime(parseISO(slot.start_time), userTimezone),
        userEndTime: toZonedTime(parseISO(slot.end_time), userTimezone)
      }));
    }
  });

  // Group slots by date in user's timezone
  const slotsByDate = useMemo(() => {
    if (!timeSlots) return {};
    
    return timeSlots.reduce((acc, slot) => {
      const dateKey = format(slot.userStartTime, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    }, {} as Record<string, any[]>);
  }, [timeSlots]);

  // Get available dates for calendar
  const availableDates = useMemo(() => {
    if (!timeSlots) return [];
    return Array.from(new Set(timeSlots.map(slot => 
      startOfDay(slot.userStartTime).getTime()
    ))).map(t => new Date(t));
  }, [timeSlots]);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return slotsByDate[dateKey] || [];
  }, [selectedDate, slotsByDate]);
  
  // Reset selected slot when date changes to avoid stale selection
  useEffect(() => {
    setSelectedTimeSlot(null);
  }, [selectedDate]);

  // Clear selected slot if it's no longer available in the updated list
  // Use a ref to track if we've already shown the toast for this slot
  const previousSelectedSlotRef = useRef<string | null>(null);
  const isBookingInProgressRef = useRef(false);
  
  useEffect(() => {
    // Don't clear selection if a booking is in progress or if booking was just completed successfully
    if (isBookingInProgressRef.current || bookingComplete) return;
    
    if (selectedTimeSlot && timeSlots) {
      const isStillAvailable = timeSlots.some((slot: any) => slot.id === selectedTimeSlot);
      if (!isStillAvailable && previousSelectedSlotRef.current === selectedTimeSlot) {
        // Only show toast if this slot was previously selected and is now unavailable
        // AND it's not because we just successfully booked it ourselves
        setSelectedTimeSlot(null);
        toast({
          title: 'Horario ya no disponible',
          description: 'El horario seleccionado fue reservado por otra persona. Por favor, selecciona otro.',
          variant: 'destructive'
        });
      }
      previousSelectedSlotRef.current = selectedTimeSlot;
    } else if (!selectedTimeSlot) {
      previousSelectedSlotRef.current = null;
    }
  }, [timeSlots, selectedTimeSlot, bookingComplete]);
  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (vars: { slotId: string; form: QuestionnaireData }) => {
      if (!vars?.slotId) throw new Error('No time slot selected');

      // Mark that booking is in progress to prevent useEffect from clearing selection
      isBookingInProgressRef.current = true;

      // Log for debugging
      console.log('Creating booking for slot:', vars.slotId);

      // The RPC function book_demo_slot already handles all availability checks atomically
      // It checks: slot exists, is_available=true, start_time >= now(), and no existing booking
      // No need for additional checks that could cause race conditions or false positives
      const { data: result, error } = await (supabase as any).rpc('book_demo_slot', {
        p_slot_id: vars.slotId,
        p_company_name: vars.form.companyName,
        p_product_type: vars.form.productType,
        p_product_count: vars.form.productCount,
        p_platform: vars.form.platform,
        p_messages_per_month: vars.form.messagesPerMonth,
        p_monthly_sales: vars.form.monthlySales,
        p_contact_name: vars.form.contactName,
        p_contact_email: vars.form.contactEmail,
        p_contact_phone: vars.form.contactPhone,
        p_company_size: vars.form.companySize || null,
        p_country: vars.form.country || null,
        p_industry: vars.form.industry || null,
        p_main_channel: vars.form.mainChannel || null,
        p_main_challenge: vars.form.mainChallenge || null,
        p_notes: null,
      });

      if (error) {
        isBookingInProgressRef.current = false;
        throw error as Error;
      }
      isBookingInProgressRef.current = false;
      return { bookingId: result };
    },
    onSuccess: async (_data, vars) => {
      // Find the confirmed slot from the current timeSlots list (before refresh)
      // This avoids RLS issues since the slot may no longer be visible after booking
      const selectedSlot = timeSlots?.find((s: any) => s.id === vars.slotId) || null;
      
      if (selectedSlot) {
        setConfirmedSlot(selectedSlot);
      } else {
        // If not found in current list, create a minimal slot object from the booking ID
        // We'll show the confirmation anyway since the booking was successful
        console.warn('Slot not found in current list, but booking succeeded');
      }
      
      // Clear selection immediately to prevent double booking
      setSelectedTimeSlot(null);
      
      // Set booking complete to prevent useEffect from showing error toast
      setBookingComplete(true);
      
      // Identify user for TikTok Pixel
      await identifyUser({
        email: vars?.form?.contactEmail,
        phoneNumber: vars?.form?.contactPhone
      });
      
      // Track Meta Pixel Schedule event
      trackCustomEvent('Schedule', {
        content_name: `Demo - ${vars?.form?.companyName || 'Unknown Company'}`,
        company_name: vars?.form?.companyName,
        product_type: vars?.form?.productType,
        monthly_sales: vars?.form?.monthlySales,
        value: 0,
        currency: 'USD'
      });
      
      // Track TikTok events
      trackTikTokLead({
        contentId: 'demo_booking',
        contentName: `Demo - ${vars?.form?.companyName || 'Unknown Company'}`,
        value: 0,
        currency: 'USD'
      });
      
      trackContact({
        contentName: `Demo Contact - ${vars?.form?.companyName || 'Unknown Company'}`,
        value: 0
      });

      // Enviar datos al webhook
      try {
        const { data: bookingData, error: fetchError } = await supabase
          .from('demo_bookings')
          .select(`
            *,
            questionnaire_response:demo_questionnaire_responses(*),
            time_slot:demo_time_slots(*)
          `)
          .eq('id', _data.bookingId)
          .single();

        if (fetchError) {
          console.error('Error obteniendo datos para webhook:', fetchError);
        } else if (bookingData) {
          console.log('Enviando datos al webhook:', bookingData);
          
          const { error: webhookError } = await supabase.functions.invoke('send-demo-booking-webhook', {
            body: {
              booking: bookingData,
              questionnaire: bookingData.questionnaire_response,
              timeSlot: bookingData.time_slot,
            }
          });

          if (webhookError) {
            console.error('Error enviando webhook:', webhookError);
          } else {
            console.log('Webhook enviado exitosamente');
          }
        }
      } catch (error) {
        console.error('Error en proceso de webhook:', error);
      }

      // Invalidate queries to refresh the slots list
      queryClient.invalidateQueries({ queryKey: ['available-demo-slots'] });
      
      // Refresh slots list (do this asynchronously so it doesn't block the UI update)
      refetchSlots();
      
      // Avanza a confirmación (paso 8) inmediatamente
      // No usamos handleNext() para evitar lógica condicional adicional
      setCurrentStep(8);
    },
    onError: (error) => {
      // Ensure booking flag is cleared on error
      isBookingInProgressRef.current = false;
      
      const raw = (error as any)?.message || (error as any)?.error_description || (error as Error)?.message || '';
      const description = /SLOT_ALREADY_BOOKED/i.test(raw)
        ? 'Ese horario ya fue reservado por otra persona. Por favor, selecciona otro horario disponible.'
        : /SLOT_NOT_AVAILABLE/i.test(raw)
        ? 'Ese horario ya no está disponible. Por favor, selecciona otro horario disponible.'
        : (raw || 'Intenta nuevamente');

      toast({
        title: 'Error al crear la reserva',
        description,
        variant: 'destructive'
      });
      
      // Clear the selected slot so user can choose another one
      setSelectedTimeSlot(null);
      
      // Refresh the slots list to show current availability
      refetchSlots();
      queryClient.invalidateQueries({ queryKey: ['available-demo-slots'] });
    }
  });

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    // If we're on the time slot selection step, create the booking
    if (currentStep === 7 && !bookingComplete) {
      if (!selectedTimeSlot) {
        toast({ title: 'Selecciona un horario', description: 'Elige un horario disponible para continuar.' });
        return;
      }
      
      // Double-check that the selected slot is still in the available list
      const isStillAvailable = timeSlots?.some((slot: any) => slot.id === selectedTimeSlot);
      if (!isStillAvailable) {
        toast({ 
          title: 'Horario no disponible', 
          description: 'Este horario ya fue reservado. Por favor, selecciona otro horario disponible.',
          variant: 'destructive'
        });
        setSelectedTimeSlot(null);
        refetchSlots();
        return;
      }
      
      // Store the slot ID in a local variable to ensure we use the correct value
      // This prevents any closure issues with selectedTimeSlot
      const slotIdToBook = selectedTimeSlot;
      
      // Prevent double booking by checking if mutation is already in progress
      if (createBookingMutation.isPending) {
        toast({
          title: 'Reserva en progreso',
          description: 'Por favor espera mientras procesamos tu reserva...',
          variant: 'default'
        });
        return;
      }
      
      // Log for debugging
      console.log('Booking slot:', slotIdToBook, 'Current selectedTimeSlot:', selectedTimeSlot);
      
      createBookingMutation.mutate({ slotId: slotIdToBook, form: data });
      return;
    }
    
    // If we're on the final confirmation step, redirect to landing
    if (currentStep === 8) {
      navigate('/');
      return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return data.companyName.trim() !== '';
      case 1:
        return data.productType !== '';
      case 2:
        return data.productCount !== '';
      case 3:
        return data.messagesPerMonth !== '';
      case 4:
        return data.monthlySales !== '';
      case 5:
        return data.platform !== '';
      case 6:
        return data.contactName.trim() !== '' && 
               data.contactEmail.trim() !== '' && 
               data.contactPhone.trim() !== '';
      case 7:
        return selectedTimeSlot !== null;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <Input
              placeholder="Ej: Mi Tienda Online"
              value={data.companyName}
              onChange={(e) => setData({ ...data, companyName: e.target.value })}
              className="h-14 text-lg"
              autoFocus
            />
          </div>
        );

      case 1:
        return (
          <Select value={data.productType} onValueChange={(value) => setData({ ...data, productType: value })}>
            <SelectTrigger className="h-14 text-lg">
              <SelectValue placeholder="Selecciona el tipo de producto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="physical">Productos físicos</SelectItem>
              <SelectItem value="digital">Productos digitales</SelectItem>
              <SelectItem value="both">Ambos</SelectItem>
            </SelectContent>
          </Select>
        );

      case 2:
        return (
          <Select value={data.productCount} onValueChange={(value) => setData({ ...data, productCount: value })}>
            <SelectTrigger className="h-14 text-lg">
              <SelectValue placeholder="Selecciona el rango" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-10">1-10 productos</SelectItem>
              <SelectItem value="11-50">11-50 productos</SelectItem>
              <SelectItem value="51-200">51-200 productos</SelectItem>
              <SelectItem value="201-500">201-500 productos</SelectItem>
              <SelectItem value="500+">Más de 500 productos</SelectItem>
            </SelectContent>
          </Select>
        );

      case 3:
        return (
          <Select value={data.messagesPerMonth} onValueChange={(value) => setData({ ...data, messagesPerMonth: value })}>
            <SelectTrigger className="h-14 text-lg">
              <SelectValue placeholder="Selecciona el rango" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-100">0-100 mensajes/mes</SelectItem>
              <SelectItem value="101-500">101-500 mensajes/mes</SelectItem>
              <SelectItem value="501-1000">501-1,000 mensajes/mes</SelectItem>
              <SelectItem value="1001-2000">1,001-2,000 mensajes/mes</SelectItem>
              <SelectItem value="2000+">Más de 2,000 mensajes/mes</SelectItem>
            </SelectContent>
          </Select>
        );

      case 4:
        return (
          <Select value={data.monthlySales} onValueChange={(value) => setData({ ...data, monthlySales: value })}>
            <SelectTrigger className="h-14 text-lg">
              <SelectValue placeholder="Selecciona el rango" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-1000">$0 - $1,000 USD/mes</SelectItem>
              <SelectItem value="1001-5000">$1,001 - $5,000 USD/mes</SelectItem>
              <SelectItem value="5001-10000">$5,001 - $10,000 USD/mes</SelectItem>
              <SelectItem value="10001-25000">$10,001 - $25,000 USD/mes</SelectItem>
              <SelectItem value="25001-50000">$25,001 - $50,000 USD/mes</SelectItem>
              <SelectItem value="50000+">Más de $50,000 USD/mes</SelectItem>
            </SelectContent>
          </Select>
        );

      case 5:
        return (
          <Select value={data.platform} onValueChange={(value) => setData({ ...data, platform: value })}>
            <SelectTrigger className="h-14 text-lg">
              <SelectValue placeholder="Selecciona tu plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shopify">Shopify</SelectItem>
              <SelectItem value="woocommerce">WooCommerce</SelectItem>
              <SelectItem value="mercadoshops">Mercado Shops</SelectItem>
              <SelectItem value="tiendanube">Tienda Nube</SelectItem>
              <SelectItem value="propia">Plataforma propia</SelectItem>
              <SelectItem value="ninguna">No uso plataforma</SelectItem>
              <SelectItem value="otra">Otra</SelectItem>
            </SelectContent>
          </Select>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-base">Nombre completo</Label>
              <Input
                id="name"
                placeholder="Tu nombre"
                value={data.contactName}
                onChange={(e) => setData({ ...data, contactName: e.target.value })}
                className="h-12 mt-2"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-base">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={data.contactEmail}
                onChange={(e) => setData({ ...data, contactEmail: e.target.value })}
                className="h-12 mt-2"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-base">Teléfono (WhatsApp)</Label>
              <PhoneInput
                country={'co'}
                value={data.contactPhone}
                onChange={(phone) => setData({ ...data, contactPhone: phone })}
                containerClass="mt-2"
                inputClass="h-12"
                inputStyle={{
                  width: '100%',
                  height: '3rem',
                  fontSize: '1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))'
                }}
                buttonStyle={{
                  borderRadius: '0.375rem 0 0 0.375rem',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--background))'
                }}
                preferredCountries={['co', 'mx', 'ar', 'cl', 'pe', 'es', 'us']}
                enableSearch={true}
                searchPlaceholder="Buscar país"
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                🌍 Zona horaria detectada: <span className="font-semibold">{userTimezone}</span>
              </p>
            </div>
            
            {slotsLoading ? (
              <div className="text-center py-8">Cargando horarios disponibles...</div>
            ) : timeSlots?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay horarios disponibles en este momento. Por favor, intenta más tarde.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendar */}
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-semibold mb-4">Selecciona una fecha</h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      const dateStart = startOfDay(date);
                      return !availableDates.some(d => isSameDay(d, dateStart));
                    }}
                    modifiers={{
                      available: availableDates
                    }}
                    modifiersClassNames={{
                      available: "bg-primary/10 font-semibold"
                    }}
                    locale={es}
                    className="rounded-md border"
                  />
                </div>

                {/* Time Slots */}
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold mb-4">
                    {selectedDate ? 'Horarios disponibles' : 'Selecciona una fecha primero'}
                  </h3>
                  {selectedDate && slotsForSelectedDate.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {slotsForSelectedDate.map((slot: any) => {
                        // Only show slot as selected if it's still in the available list
                        const isSelected = selectedTimeSlot === slot.id && 
                          slotsForSelectedDate.some((s: any) => s.id === slot.id);
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => {
                              // Verify slot is still available before selecting
                              const isStillAvailable = slotsForSelectedDate.some((s: any) => s.id === slot.id);
                              if (isStillAvailable) {
                                // Set the new slot directly - React will batch updates
                                setSelectedTimeSlot(slot.id);
                              } else {
                                // Slot no longer available, refresh and show error
                                setSelectedTimeSlot(null);
                                refetchSlots();
                                toast({
                                  title: 'Horario no disponible',
                                  description: 'Este horario ya fue reservado. Selecciona otro.',
                                  variant: 'destructive'
                                });
                              }
                            }}
                            className={`p-3 border-2 rounded-lg transition-all hover:border-primary ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground' 
                                : 'border-border'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">
                                {format(slot.userStartTime, 'HH:mm', { locale: es })}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : selectedDate ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay horarios disponibles para esta fecha
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Selecciona una fecha del calendario</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 8:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">¡Gracias, {data.contactName}!</h3>
              <p className="text-muted-foreground">
                Hemos recibido tu solicitud de demo. Te enviaremos un email de confirmación a{' '}
                <span className="font-medium">{data.contactEmail}</span> con todos los detalles.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                También te contactaremos por WhatsApp al {data.contactPhone} antes de la reunión.
              </p>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm">
                <strong>Empresa:</strong> {data.companyName}<br />
                <strong>Industria:</strong> {data.industry}<br />
                <strong>Horario seleccionado:</strong>{' '}
                {confirmedSlot
                  ? format(confirmedSlot.userStartTime, 'PPp', { locale: es })
                  : '—'}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="min-h-[600px] flex flex-col justify-center">
          {/* Step indicator */}
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground mb-2">
              Paso {currentStep + 1} de {steps.length}
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold mb-3">
              {steps[currentStep].title}
            </h2>
            <p className="text-lg text-muted-foreground">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 mb-8">
            <div className="max-w-xl mx-auto">
              {renderStepContent()}
            </div>
          </div>

          {/* Navigation */}
          {currentStep < steps.length && (
            <div className="flex items-center justify-between gap-4 max-w-xl mx-auto w-full">
              {currentStep !== 8 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0 || createBookingMutation.isPending}
                  className="h-12"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Atrás
                </Button>
              )}

              <Button
                onClick={handleNext}
                disabled={(!isStepValid() && currentStep !== 8) || (createBookingMutation.isPending && !bookingComplete)}
                className={`h-12 px-8 ${currentStep === 8 ? 'w-full' : ''}`}
              >
                {createBookingMutation.isPending && !bookingComplete ? (
                  'Reservando...'
                ) : currentStep === 8 ? (
                  'Ir a Inicio'
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
