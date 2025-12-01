import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' }
];

const TIME_OPTIONS = [];
for (let hour = 0; hour < 24; hour++) {
  TIME_OPTIONS.push(`${hour.toString().padStart(2, '0')}:00`);
  TIME_OPTIONS.push(`${hour.toString().padStart(2, '0')}:30`);
}

export function AvailabilityScheduleManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingDay, setEditingDay] = useState<number | null>(null);

  // Generate slots mutation
  const generateSlotsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-demo-slots', {
        body: { weeks_ahead: 4 }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Slots generados', 
        description: `Se generaron ${data.slots_generated} espacios disponibles` 
      });
      queryClient.invalidateQueries({ queryKey: ['demo-time-slots'] });
    },
    onError: (error) => {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'No se pudieron generar los slots',
        variant: 'destructive' 
      });
    }
  });

  // Fetch availability schedule
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['availability-schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_schedule')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Group schedule by day
  const scheduleByDay = schedule?.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, any[]>) || {};

  // Add availability mutation
  const addAvailabilityMutation = useMutation({
    mutationFn: async (slot: Omit<AvailabilitySlot, 'id'>) => {
      const { error } = await supabase
        .from('availability_schedule')
        .insert(slot);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-schedule'] });
      toast({ title: 'Horario agregado' });
      setEditingDay(null);
    },
    onError: (error) => {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'No se pudo agregar',
        variant: 'destructive' 
      });
    }
  });

  // Delete availability mutation
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('availability_schedule')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-schedule'] });
      toast({ title: 'Horario eliminado' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'No se pudo eliminar',
        variant: 'destructive' 
      });
    }
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('availability_schedule')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-schedule'] });
    }
  });

  const handleAddTimeSlot = (day: number, startTime: string, endTime: string) => {
    if (!startTime || !endTime) {
      toast({ title: 'Error', description: 'Completa todos los campos', variant: 'destructive' });
      return;
    }

    if (startTime >= endTime) {
      toast({ title: 'Error', description: 'La hora de inicio debe ser antes de la hora de fin', variant: 'destructive' });
      return;
    }

    addAvailabilityMutation.mutate({
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      is_active: true
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Horarios Semanales de Disponibilidad</CardTitle>
            <CardDescription>
              Configura tus horarios recurrentes. Luego genera los espacios de 30 minutos.
            </CardDescription>
          </div>
          <Button 
            onClick={() => generateSlotsMutation.mutate()}
            disabled={generateSlotsMutation.isPending}
          >
            {generateSlotsMutation.isPending ? 'Generando...' : 'Generar Horarios'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : (
          <div className="space-y-6">
            {DAYS.map((day) => {
              const daySlots = scheduleByDay[day.value] || [];
              const isEditing = editingDay === day.value;

              return (
                <div key={day.value} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                        {day.label[0]}
                      </div>
                      <h3 className="font-semibold">{day.label}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingDay(isEditing ? null : day.value)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Existing time slots */}
                  {daySlots.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {daySlots.map((slot) => (
                        <div key={slot.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {slot.start_time} - {slot.end_time}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={slot.is_active}
                              onCheckedChange={(checked) => 
                                toggleActiveMutation.mutate({ id: slot.id, is_active: checked })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAvailabilityMutation.mutate(slot.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">No disponible</p>
                  )}

                  {/* Add new time slot form */}
                  {isEditing && (
                    <AddTimeSlotForm
                      onAdd={(start, end) => handleAddTimeSlot(day.value, start, end)}
                      isPending={addAvailabilityMutation.isPending}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddTimeSlotForm({ onAdd, isPending }: { onAdd: (start: string, end: string) => void; isPending: boolean }) {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const handleSubmit = () => {
    onAdd(startTime, endTime);
    setStartTime('09:00');
    setEndTime('17:00');
  };

  return (
    <div className="grid grid-cols-2 gap-2 p-3 bg-background border rounded-lg">
      <div>
        <Label className="text-xs">Desde</Label>
        <Select value={startTime} onValueChange={setStartTime}>
          <SelectTrigger className="h-9 mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((time) => (
              <SelectItem key={time} value={time}>{time}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Hasta</Label>
        <Select value={endTime} onValueChange={setEndTime}>
          <SelectTrigger className="h-9 mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((time) => (
              <SelectItem key={time} value={time}>{time}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button 
        onClick={handleSubmit} 
        disabled={isPending}
        size="sm"
        className="col-span-2"
      >
        {isPending ? 'Agregando...' : 'Agregar horario'}
      </Button>
    </div>
  );
}
