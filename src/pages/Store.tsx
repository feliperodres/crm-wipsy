import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/ui/image-upload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Store as StoreIcon, Copy, ExternalLink, Palette, Settings, Truck, Plus, Trash2, CreditCard, Save, Loader2 } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import debounce from 'lodash/debounce';
import { Json } from '@/integrations/supabase/types';

interface ShippingRate {
  id: string;
  name: string;
  price: number;
  condition_type: 'none' | 'minimum_order' | 'weight_based';
  condition_value?: number;
  description?: string;
}

interface PaymentMethods {
  cash_on_delivery: boolean;
  bank_transfer: boolean;
  instructions: string;
}

interface StoreSettings {
  id?: string;
  store_name: string;
  store_description: string;
  logo_url: string;
  banner_url: string;
  primary_color: string;
  accent_color: string;
  is_active: boolean;
  store_slug: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  address: string;
  show_out_of_stock: boolean;
  show_whatsapp_button: boolean;
  shipping_rates: ShippingRate[];
  payment_methods: PaymentMethods;
}

// Helper type for casting Supabase response
interface SupabaseStoreSettings {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  is_active: boolean;
  store_slug: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_number: string | null;
  address: string | null;
  shipping_rates: Json | null;
  payment_methods: Json | null;
  // Add index signature to allow for the new column before types are updated
  [key: string]: unknown;
}

export default function Store() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    store_name: 'Mi Tienda',
    store_description: '',
    logo_url: '',
    banner_url: '',
    primary_color: '#3b82f6',
    accent_color: '#06b6d4',
    is_active: true,
    store_slug: '',
    contact_email: '',
    contact_phone: '',
    whatsapp_number: '',
    address: '',
    show_out_of_stock: true,
    show_whatsapp_button: true,
    shipping_rates: [],
    payment_methods: {
      cash_on_delivery: true,
      bank_transfer: true,
      instructions: 'Para transferencias, nos contactaremos contigo después del pedido para coordinar el pago.'
    }
  });

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const fetchStoreSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const typedData = data as unknown as SupabaseStoreSettings;

        // Parse shipping rates and payment methods safely
        const parsedShippingRates = (() => {
          const raw = typedData.shipping_rates;
          try {
            if (Array.isArray(raw)) return raw as unknown as ShippingRate[];
            if (typeof raw === 'string') return JSON.parse(raw) as ShippingRate[];
            if (raw && typeof raw === 'object' && 'rates' in raw) return (raw as { rates: unknown }).rates as ShippingRate[];
            return [] as ShippingRate[];
          } catch {
            return [] as ShippingRate[];
          }
        })();

        const parsedPaymentMethods: PaymentMethods = (() => {
          const raw = typedData.payment_methods;
          try {
            const pm = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const typedPm = pm as { cash_on_delivery?: boolean; bank_transfer?: boolean; instructions?: string } | null;
            return {
              cash_on_delivery: typedPm?.cash_on_delivery ?? true,
              bank_transfer: typedPm?.bank_transfer ?? true,
              instructions: typedPm?.instructions ?? ''
            } as PaymentMethods;
          } catch {
            return { cash_on_delivery: true, bank_transfer: true, instructions: '' } as PaymentMethods;
          }
        })();

        setStoreSettings({
          id: typedData.id,
          store_name: typedData.store_name,
          store_description: typedData.store_description || '',
          logo_url: typedData.logo_url || '',
          banner_url: typedData.banner_url || '',
          primary_color: typedData.primary_color || '#3b82f6',
          accent_color: typedData.accent_color || '#06b6d4',
          is_active: typedData.is_active,
          store_slug: typedData.store_slug || '',
          contact_email: typedData.contact_email || '',
          contact_phone: typedData.contact_phone || '',
          whatsapp_number: typedData.whatsapp_number || '',
          address: typedData.address || '',
          show_out_of_stock: (typedData.show_out_of_stock as boolean) ?? true,
          show_whatsapp_button: (typedData.show_whatsapp_button as boolean) ?? true,
          shipping_rates: parsedShippingRates,
          payment_methods: parsedPaymentMethods,
        });
      } else {
        // Create default settings if none exist
        const { data: newSettings, error: createError } = await supabase
          .from('store_settings')
          .insert([{
            user_id: user.id,
            store_name: 'Mi Tienda',
            store_slug: `store-${Math.random().toString(36).substring(7)}`,
            is_active: true,
            show_out_of_stock: true
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any]) // Cast to any to bypass strict type check on new column
          .select()
          .single();

        if (createError) throw createError;
        if (newSettings) {
          // We can safely cast here because we just created it
          const typedNewSettings = newSettings as unknown as SupabaseStoreSettings;
          setStoreSettings(prev => ({
            ...prev,
            id: typedNewSettings.id,
            store_name: typedNewSettings.store_name,
            store_slug: typedNewSettings.store_slug || '',
            show_out_of_stock: true
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching store settings:', error);
      toast.error('Error al cargar la configuración de la tienda');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStoreSettings();
    }
  }, [user, fetchStoreSettings]);

  // Auto-save functionality
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce(async (settings: StoreSettings) => {
      if (!user || !settings.id) return;

      setSaving(true);
      try {
        const updateData: Partial<SupabaseStoreSettings> = {
          store_name: settings.store_name,
          store_description: settings.store_description,
          logo_url: settings.logo_url,
          banner_url: settings.banner_url,
          primary_color: settings.primary_color,
          accent_color: settings.accent_color,
          is_active: settings.is_active,
          store_slug: settings.store_slug,
          contact_email: settings.contact_email,
          contact_phone: settings.contact_phone,
          whatsapp_number: settings.whatsapp_number,
          address: settings.address,
          show_out_of_stock: settings.show_out_of_stock,
          show_whatsapp_button: settings.show_whatsapp_button,
          shipping_rates: settings.shipping_rates as unknown as Json,
          payment_methods: settings.payment_methods as unknown as Json,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('store_settings')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(updateData as unknown as any) // Still need any or a proper type that matches the table definition which is missing the column
          .eq('id', settings.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error saving store settings:', error);
        toast.error('Error al guardar los cambios');
      } finally {
        setSaving(false);
      }
    }, 1000),
    [user]
  );

  useEffect(() => {
    if (storeSettings.id) {
      debouncedSave(storeSettings);
    }
  }, [storeSettings, debouncedSave]);

  const handleInputChange = (field: keyof StoreSettings, value: string | boolean | PaymentMethods | ShippingRate[]) => {
    setStoreSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleShippingRateChange = (index: number, field: keyof ShippingRate, value: string | number) => {
    const newRates = [...storeSettings.shipping_rates];
    newRates[index] = { ...newRates[index], [field]: value };
    setStoreSettings(prev => ({ ...prev, shipping_rates: newRates }));
  };

  const addShippingRate = () => {
    const newRate: ShippingRate = {
      id: crypto.randomUUID(),
      name: 'Envío Estándar',
      price: 0,
      condition_type: 'none'
    };
    setStoreSettings(prev => ({ ...prev, shipping_rates: [...prev.shipping_rates, newRate] }));
  };

  const removeShippingRate = (index: number) => {
    const newRates = storeSettings.shipping_rates.filter((_, i) => i !== index);
    setStoreSettings(prev => ({ ...prev, shipping_rates: newRates }));
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('store-assets')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('store-assets').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const copyStoreUrl = () => {
    const url = `${window.location.origin}/store/${storeSettings.store_slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado al portapapeles');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8 max-w-6xl mx-auto pb-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Configuración de Tienda</h1>
            <p className="text-muted-foreground mt-1">Personaliza tu tienda online y gestiona tus preferencias.</p>
          </div>
          <div className="flex items-center gap-3">
            {saving && (
              <span className="text-sm text-muted-foreground flex items-center gap-2 animate-pulse">
                <Save className="h-4 w-4" /> Guardando...
              </span>
            )}
            <Button variant="outline" onClick={copyStoreUrl} className="gap-2">
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copiar Enlace</span>
            </Button>
            <Button onClick={() => window.open(`/store/${storeSettings.store_slug}`, '_blank')} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Ver Tienda</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: General Info & Logistics */}
          <div className="lg:col-span-2 space-y-8">

            {/* General Information Card */}
            <motion.div variants={itemVariants}>
              <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <StoreIcon className="h-5 w-5 text-primary" />
                    <CardTitle>Información General</CardTitle>
                  </div>
                  <CardDescription>Datos básicos de tu tienda visibles para los clientes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="storeName">Nombre de la Tienda</Label>
                      <Input
                        id="storeName"
                        value={storeSettings.store_name}
                        onChange={(e) => handleInputChange('store_name', e.target.value)}
                        placeholder="Ej: Mi Tienda Increíble"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storeSlug">URL de la Tienda (Slug)</Label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                          /store/
                        </span>
                        <Input
                          id="storeSlug"
                          value={storeSettings.store_slug}
                          onChange={(e) => handleInputChange('store_slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={storeSettings.store_description}
                      onChange={(e) => handleInputChange('store_description', e.target.value)}
                      placeholder="Describe tu tienda en pocas palabras..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Teléfono de Contacto</Label>
                      <Input
                        id="contactPhone"
                        value={storeSettings.contact_phone}
                        onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                        placeholder="+57 300 123 4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Email de Contacto</Label>
                      <Input
                        id="contactEmail"
                        value={storeSettings.contact_email}
                        onChange={(e) => handleInputChange('contact_email', e.target.value)}
                        placeholder="contacto@mitienda.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección Física (Opcional)</Label>
                    <Input
                      id="address"
                      value={storeSettings.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Calle 123 # 45-67, Ciudad"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Shipping Rates Card */}
            <motion.div variants={itemVariants}>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-blue-500" />
                      <CardTitle>Métodos de Envío</CardTitle>
                    </div>
                    <Button size="sm" variant="outline" onClick={addShippingRate} className="gap-1">
                      <Plus className="h-4 w-4" /> Agregar
                    </Button>
                  </div>
                  <CardDescription>Configura las tarifas de envío para tus clientes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {storeSettings.shipping_rates.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                      <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No hay tarifas de envío configuradas.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {storeSettings.shipping_rates.map((rate, index) => (
                        <div key={rate.id} className="flex flex-col md:flex-row gap-4 items-start md:items-end p-4 border rounded-lg bg-gray-50/50">
                          <div className="flex-1 space-y-2 w-full">
                            <Label>Nombre</Label>
                            <Input
                              value={rate.name}
                              onChange={(e) => handleShippingRateChange(index, 'name', e.target.value)}
                              placeholder="Ej: Envío Express"
                            />
                          </div>
                          <div className="w-full md:w-32 space-y-2">
                            <Label>Precio</Label>
                            <Input
                              type="number"
                              value={rate.price}
                              onChange={(e) => handleShippingRateChange(index, 'price', Number(e.target.value))}
                            />
                          </div>
                          <div className="w-full md:w-48 space-y-2">
                            <Label>Condición</Label>
                            <Select
                              value={rate.condition_type}
                              onValueChange={(value) => handleShippingRateChange(index, 'condition_type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin condición</SelectItem>
                                <SelectItem value="minimum_order">Pedido mínimo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {rate.condition_type !== 'none' && (
                            <div className="w-full md:w-32 space-y-2">
                              <Label>Valor</Label>
                              <Input
                                type="number"
                                value={rate.condition_value || 0}
                                onChange={(e) => handleShippingRateChange(index, 'condition_value', Number(e.target.value))}
                              />
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removeShippingRate(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Payment Methods Card */}
            <motion.div variants={itemVariants}>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-green-500" />
                    <CardTitle>Métodos de Pago</CardTitle>
                  </div>
                  <CardDescription>Habilita las opciones de pago para tus clientes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base">Pago Contra Entrega</Label>
                      <p className="text-sm text-muted-foreground">El cliente paga al recibir el producto.</p>
                    </div>
                    <Switch
                      checked={storeSettings.payment_methods.cash_on_delivery}
                      onCheckedChange={(checked) =>
                        handleInputChange('payment_methods', { ...storeSettings.payment_methods, cash_on_delivery: checked })
                      }
                    />
                  </div>

                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Transferencia Bancaria</Label>
                        <p className="text-sm text-muted-foreground">Instrucciones para pago manual.</p>
                      </div>
                      <Switch
                        checked={storeSettings.payment_methods.bank_transfer}
                        onCheckedChange={(checked) =>
                          handleInputChange('payment_methods', { ...storeSettings.payment_methods, bank_transfer: checked })
                        }
                      />
                    </div>

                    {storeSettings.payment_methods.bank_transfer && (
                      <div className="pt-2">
                        <Label>Instrucciones de Pago</Label>
                        <Textarea
                          value={storeSettings.payment_methods.instructions}
                          onChange={(e) =>
                            handleInputChange('payment_methods', { ...storeSettings.payment_methods, instructions: e.target.value })
                          }
                          placeholder="Ej: Nequi 3001234567 a nombre de..."
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column: Design & Settings */}
          <div className="space-y-8">

            {/* Visibility & Status Card */}
            <motion.div variants={itemVariants}>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-500" />
                    <CardTitle>Estado y Visibilidad</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Tienda Activa</Label>
                      <p className="text-sm text-muted-foreground">Visible para el público.</p>
                    </div>
                    <Switch
                      checked={storeSettings.is_active}
                      onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Mostrar Agotados</Label>
                      <p className="text-sm text-muted-foreground">Mostrar productos sin stock.</p>
                    </div>
                    <Switch
                      checked={storeSettings.show_out_of_stock}
                      onCheckedChange={(checked) => handleInputChange('show_out_of_stock', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Botón de WhatsApp</Label>
                      <p className="text-sm text-muted-foreground">Mostrar botón flotante para contactar por WhatsApp.</p>
                    </div>
                    <Switch
                      checked={storeSettings.show_whatsapp_button}
                      onCheckedChange={(checked) => handleInputChange('show_whatsapp_button', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Branding Card */}
            <motion.div variants={itemVariants}>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-purple-500" />
                    <CardTitle>Diseño y Marca</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Logo de la Tienda</Label>
                    <div className="flex justify-center p-4 border-2 border-dashed rounded-lg bg-gray-50">
                      <ImageUpload
                        currentImage={storeSettings.logo_url}
                        onUpload={async (file) => {
                          const url = await handleImageUpload(file);
                          handleInputChange('logo_url', url);
                          return url;
                        }}
                        onRemove={() => handleInputChange('logo_url', '')}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Banner Principal</Label>
                    <div className="flex justify-center p-4 border-2 border-dashed rounded-lg bg-gray-50">
                      <ImageUpload
                        currentImage={storeSettings.banner_url}
                        onUpload={async (file) => {
                          const url = await handleImageUpload(file);
                          handleInputChange('banner_url', url);
                          return url;
                        }}
                        onRemove={() => handleInputChange('banner_url', '')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Color Principal</Label>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full border shadow-sm"
                          style={{ backgroundColor: storeSettings.primary_color }}
                        />
                        <Input
                          type="color"
                          value={storeSettings.primary_color}
                          onChange={(e) => handleInputChange('primary_color', e.target.value)}
                          className="w-full h-8 p-1 cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Color Secundario</Label>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full border shadow-sm"
                          style={{ backgroundColor: storeSettings.accent_color }}
                        />
                        <Input
                          type="color"
                          value={storeSettings.accent_color}
                          onChange={(e) => handleInputChange('accent_color', e.target.value)}
                          className="w-full h-8 p-1 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}