import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Plus, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShippingRate {
  id: string;
  name: string;
  price: number;
  condition_type: 'none' | 'minimum_order' | 'weight_based';
  condition_value?: number;
  description?: string;
}

interface OnboardingShippingProps {
  onNext: () => void;
  onBack: () => void;
}

export default function OnboardingShipping({ onNext, onBack }: OnboardingShippingProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<ShippingRate[]>([]);

  useEffect(() => {
    loadExistingRates();
  }, [user]);

  const loadExistingRates = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('shipping_rates')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.shipping_rates && Array.isArray(data.shipping_rates)) {
        setRates(data.shipping_rates as any);
      }
    } catch (error) {
      console.error('Error loading shipping rates:', error);
    }
  };

  const addRate = () => {
    const newRate: ShippingRate = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      condition_type: 'none',
      description: ''
    };
    setRates([...rates, newRate]);
  };

  const removeRate = (id: string) => {
    setRates(rates.filter(r => r.id !== id));
  };

  const updateRate = (id: string, updates: Partial<ShippingRate>) => {
    setRates(rates.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleSave = async () => {
    if (rates.length === 0) {
      toast.error('Debes crear al menos una tarifa de envío');
      return;
    }

    // Validar que todas las tarifas tengan nombre y precio
    const invalidRates = rates.filter(r => !r.name.trim() || r.price <= 0);
    if (invalidRates.length > 0) {
      toast.error('Todas las tarifas deben tener nombre y precio válido');
      return;
    }

    setLoading(true);

    try {
      // Verificar si existe store_settings
      const { data: existingSettings, error: selectError } = await supabase
        .from('store_settings')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') throw selectError;

      if (existingSettings) {
        // Actualizar
        const { error } = await supabase
          .from('store_settings')
          .update({ shipping_rates: rates as any })
          .eq('user_id', user?.id);

        if (error) throw error;
      } else {
        // Crear
        const { error } = await supabase
          .from('store_settings')
          .insert({
            user_id: user?.id,
            shipping_rates: rates as any,
            store_name: 'Mi Tienda',
            is_active: true
          });

        if (error) throw error;
      }

      toast.success('Tarifas de envío configuradas exitosamente');
      onNext();
    } catch (error: any) {
      console.error('Error saving shipping rates:', error);
      toast.error('Error al guardar las tarifas de envío');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/30">
            <Truck className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Configura tus tarifas de envío
          </h2>
          <p className="text-slate-400">
            El agente necesita saber cuánto cobrar por los envíos para procesar pedidos
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {rates.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed border-white/10 rounded-xl bg-white/5">
            <Truck className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No hay tarifas configuradas</p>
            <Button onClick={addRate} variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Agregar primera tarifa
            </Button>
          </div>
        )}

        {rates.map((rate, index) => (
          <div key={rate.id} className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="font-semibold text-white">Tarifa #{index + 1}</Label>
              {rates.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRate(rate.id)}
                  className="hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`name-${rate.id}`} className="text-slate-300">Nombre</Label>
                <Input
                  id={`name-${rate.id}`}
                  placeholder="Envío nacional"
                  value={rate.name}
                  onChange={(e) => updateRate(rate.id, { name: e.target.value })}
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`price-${rate.id}`} className="text-slate-300">Precio ($)</Label>
                <Input
                  id={`price-${rate.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10000"
                  value={rate.price || ''}
                  onChange={(e) => updateRate(rate.id, { price: parseFloat(e.target.value) || 0 })}
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`condition-${rate.id}`} className="text-slate-300">Condición</Label>
              <Select
                value={rate.condition_type}
                onValueChange={(value: any) => updateRate(rate.id, { condition_type: value })}
                disabled={loading}
              >
                <SelectTrigger id={`condition-${rate.id}`} className="bg-white/5 border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="none" className="text-white hover:bg-white/10">Sin condición</SelectItem>
                  <SelectItem value="minimum_order" className="text-white hover:bg-white/10">Pedido mínimo</SelectItem>
                  <SelectItem value="weight_based" className="text-white hover:bg-white/10">Por peso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rate.condition_type !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor={`condition-value-${rate.id}`} className="text-slate-300">
                  {rate.condition_type === 'minimum_order' ? 'Valor mínimo ($)' : 'Peso máximo (kg)'}
                </Label>
                <Input
                  id={`condition-value-${rate.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={rate.condition_type === 'minimum_order' ? '50000' : '5'}
                  value={rate.condition_value || ''}
                  onChange={(e) => updateRate(rate.id, { condition_value: parseFloat(e.target.value) || undefined })}
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
        ))}

        {rates.length > 0 && (
          <Button onClick={addRate} variant="outline" className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white" disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar otra tarifa
          </Button>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={loading} className="bg-white/5 border-white/10 hover:bg-white/10 text-white">
          Volver
        </Button>
        <Button onClick={handleSave} disabled={loading || rates.length === 0} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Finalizar Configuración'
          )}
        </Button>
      </div>
    </div>
  );
}
