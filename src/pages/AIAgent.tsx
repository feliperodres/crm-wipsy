import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, Variants } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Bot, Save, CheckCircle, Plus, Trash2, User, Database, CreditCard, Settings, Zap } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PaymentAccount {
  bank: string;
  account: string;
  name: string;
}

export default function AIAgent() {
  const [storeInfo, setStoreInfo] = useState('');
  const [salesMode, setSalesMode] = useState<'advise_only' | 'complete_sale'>('advise_only');
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<'advance_only' | 'on_delivery' | 'both'>('both');

  // New personalization fields
  const [agentName, setAgentName] = useState('Asistente Virtual');
  const [proactivityLevel, setProactivityLevel] = useState<'reactive' | 'proactive'>('reactive');
  const [customerTreatment, setCustomerTreatment] = useState<'tu' | 'usted' | 'cliente' | 'nombre_propio'>('tu');
  const [welcomeMessage, setWelcomeMessage] = useState('Hola! Soy tu asistente virtual, ¿en qué puedo ayudarte hoy?');
  const [callToAction, setCallToAction] = useState('¿Te gustaría que procese tu pedido?');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [website, setWebsite] = useState('');

  // New customer management fields
  const [newCustomerAgentEnabled, setNewCustomerAgentEnabled] = useState(true);
  const [disableAgentOnManualReply, setDisableAgentOnManualReply] = useState(true);
  const [autoReactivationEnabled, setAutoReactivationEnabled] = useState(true);
  const [autoReactivationHours, setAutoReactivationHours] = useState(24);

  // New notification settings
  const [notificationPhone, setNotificationPhone] = useState('');

  // Message buffer configuration
  const [messageBufferSeconds, setMessageBufferSeconds] = useState(3);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasConfiguration, setHasConfiguration] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const initialLoadRef = useRef(true);

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

  useEffect(() => {
    if (user?.id) {
      fetchUserProfile();
    }
  }, [user?.id]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('store_info, sales_mode, payment_accounts, payment_methods, agent_name, proactivity_level, customer_treatment, welcome_message, call_to_action, special_instructions, website, new_customer_agent_enabled, disable_agent_on_manual_reply, auto_reactivation_hours, notification_phone, message_buffer_seconds')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStoreInfo(data.store_info || '');
        setSalesMode((data.sales_mode as 'advise_only' | 'complete_sale') || 'advise_only');
        setPaymentAccounts(Array.isArray(data.payment_accounts) ? data.payment_accounts as unknown as PaymentAccount[] : []);
        setPaymentMethods((data.payment_methods as 'advance_only' | 'on_delivery' | 'both') || 'both');

        // Load new personalization fields
        setAgentName(data.agent_name || 'Asistente Virtual');
        setProactivityLevel((data.proactivity_level as 'reactive' | 'proactive') || 'reactive');
        setCustomerTreatment((data.customer_treatment as 'tu' | 'usted' | 'cliente' | 'nombre_propio') || 'tu');
        setWelcomeMessage(data.welcome_message || 'Hola! Soy tu asistente virtual, ¿en qué puedo ayudarte hoy?');
        setCallToAction(data.call_to_action || '¿Te gustaría que procese tu pedido?');
        // Special instructions may be plain text or JSON with notes + featured_products
        try {
          const parsed = data.special_instructions ? JSON.parse(data.special_instructions) : null;
          if (parsed && typeof parsed === 'object') {
            setSpecialInstructions(parsed.notes || parsed.instructions || '');
          } else {
            setSpecialInstructions(data.special_instructions || '');
          }
        } catch {
          setSpecialInstructions(data.special_instructions || '');
        }
        setWebsite(data.website || '');

        // Load new customer management fields
        setNewCustomerAgentEnabled(data.new_customer_agent_enabled ?? true);
        setDisableAgentOnManualReply(data.disable_agent_on_manual_reply ?? true);
        setAutoReactivationEnabled(data.auto_reactivation_hours !== null && data.auto_reactivation_hours > 0);
        setAutoReactivationHours(data.auto_reactivation_hours || 24);

        // Load notification settings
        setNotificationPhone(data.notification_phone || '');

        // Load message buffer configuration
        setMessageBufferSeconds(data.message_buffer_seconds ?? 3);

        setHasConfiguration(!!(data.store_info));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración del agente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      initialLoadRef.current = false;
    }
  };

  const addPaymentAccount = () => {
    setPaymentAccounts([...paymentAccounts, { bank: '', account: '', name: '' }]);
  };

  const removePaymentAccount = (index: number) => {
    setPaymentAccounts(paymentAccounts.filter((_, i) => i !== index));
  };

  const updatePaymentAccount = (index: number, field: keyof PaymentAccount, value: string) => {
    const updated = paymentAccounts.map((account, i) =>
      i === index ? { ...account, [field]: value } : account
    );
    setPaymentAccounts(updated);
  };

  const handleSaveConfiguration = useCallback(async (showToast: boolean = false) => {
    if (!storeInfo.trim() || !user?.id) {
      return;
    }

    setSaving(true);

    try {
      // First, check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, special_instructions')
        .eq('user_id', user.id)
        .maybeSingle();

      // Build special_instructions preserving featured_products if present
      let mergedSpecialInstructions: string = specialInstructions;
      try {
        const parsed = existingProfile?.special_instructions
          ? JSON.parse(existingProfile.special_instructions)
          : null;
        if (parsed && typeof parsed === 'object') {
          const out: any = { ...parsed };
          // Preserve existing featured lists if any
          if (Array.isArray(parsed.featured_products)) out.featured_products = parsed.featured_products;
          if (Array.isArray(parsed.featuredProducts)) out.featuredProducts = parsed.featuredProducts;
          // Store free-text notes separately
          out.notes = specialInstructions || '';
          mergedSpecialInstructions = JSON.stringify(out);
        }
      } catch {
        // Keep as plain text if previous value wasn't JSON
        mergedSpecialInstructions = specialInstructions;
      }

      const configData = {
        store_info: storeInfo,
        sales_mode: salesMode,
        payment_accounts: paymentAccounts as any,
        payment_methods: paymentMethods,
        agent_name: agentName,
        proactivity_level: proactivityLevel,
        customer_treatment: customerTreatment,
        welcome_message: welcomeMessage,
        call_to_action: callToAction,
        special_instructions: mergedSpecialInstructions,
        website: website,
        new_customer_agent_enabled: newCustomerAgentEnabled,
        disable_agent_on_manual_reply: disableAgentOnManualReply,
        auto_reactivation_hours: autoReactivationEnabled ? autoReactivationHours : null,
        notification_phone: notificationPhone,
        message_buffer_seconds: messageBufferSeconds
      };

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(configData)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user?.email,
            ...configData
          });

        if (error) throw error;
      }

      setHasConfiguration(true);

      if (showToast) {
        toast({
          title: "Configuración guardada",
          description: "La configuración del agente IA se ha guardado correctamente"
        });
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      if (showToast) {
        toast({
          title: "Error",
          description: "No se pudo guardar la configuración del agente IA",
          variant: "destructive"
        });
      }
    } finally {
      setSaving(false);
    }
  }, [
    storeInfo, salesMode, paymentAccounts, paymentMethods, agentName,
    proactivityLevel, customerTreatment, welcomeMessage, callToAction,
    specialInstructions, website, newCustomerAgentEnabled,
    disableAgentOnManualReply, autoReactivationEnabled, autoReactivationHours,
    notificationPhone, messageBufferSeconds, user, toast
  ]);

  // Auto-save when any field changes (with debounce)
  useEffect(() => {
    // Skip auto-save on initial load
    if (initialLoadRef.current || !user?.id) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save after 1 second of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveConfiguration(false);
    }, 1000);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    storeInfo, salesMode, paymentAccounts, paymentMethods, agentName,
    proactivityLevel, customerTreatment, welcomeMessage, callToAction,
    specialInstructions, website, newCustomerAgentEnabled,
    disableAgentOnManualReply, autoReactivationEnabled, autoReactivationHours,
    notificationPhone, messageBufferSeconds, handleSaveConfiguration, user?.id
  ]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Bot className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Cargando configuración...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        className="max-w-6xl mx-auto space-y-8 pb-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agente IA</h1>
            <p className="text-muted-foreground text-lg">
              Personaliza el cerebro de tu asistente virtual
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Configuration */}
          <div className="lg:col-span-2 space-y-6">

            {/* Identity & Personality */}
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <User className="h-5 w-5 text-primary" />
                    Identidad y Personalidad
                  </CardTitle>
                  <CardDescription>
                    Define cómo se presenta y comunica tu agente con los clientes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="agentName">Nombre del Agente</Label>
                      <Input
                        id="agentName"
                        placeholder="Ej: María, Asistente Virtual..."
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="website">Sitio Web (Opcional)</Label>
                      <Input
                        id="website"
                        placeholder="https://mitienda.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        type="url"
                        className="bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Tratamiento al Cliente</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { value: 'tu', label: 'Tú', desc: 'Informal' },
                        { value: 'usted', label: 'Usted', desc: 'Formal' },
                        { value: 'cliente', label: 'Cliente', desc: 'Neutro' },
                        { value: 'nombre_propio', label: 'Nombre', desc: 'Personal' }
                      ].map((option) => (
                        <div
                          key={option.value}
                          onClick={() => setCustomerTreatment(option.value as any)}
                          className={`
                            cursor-pointer rounded-lg border p-3 text-center transition-all hover:border-primary
                            ${customerTreatment === option.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card'}
                          `}
                        >
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="welcomeMessage">Mensaje de Bienvenida</Label>
                    <Textarea
                      id="welcomeMessage"
                      placeholder="Personaliza el saludo inicial..."
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      rows={3}
                      className="resize-none bg-background"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="callToAction">Call to Action (Cierre)</Label>
                    <Textarea
                      id="callToAction"
                      placeholder="Frase para cerrar ventas..."
                      value={callToAction}
                      onChange={(e) => setCallToAction(e.target.value)}
                      rows={2}
                      className="resize-none bg-background"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Knowledge Base */}
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Database className="h-5 w-5 text-primary" />
                    Base de Conocimiento
                  </CardTitle>
                  <CardDescription>
                    La información que tu agente usará para responder
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="storeInfo">Información del Negocio</Label>
                    <div className="relative">
                      <Textarea
                        id="storeInfo"
                        placeholder="Describe tu negocio, productos, horarios, ubicación y políticas..."
                        value={storeInfo}
                        onChange={(e) => setStoreInfo(e.target.value)}
                        rows={8}
                        className="resize-none bg-background min-h-[200px]"
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                        {storeInfo.length} caracteres
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cuanta más información proporciones, más precisas serán las respuestas.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="specialInstructions">Instrucciones Especiales (Prompt del Sistema)</Label>
                    <Textarea
                      id="specialInstructions"
                      placeholder="Reglas específicas: 'Nunca des precios', 'Siempre ofrece envío gratis'..."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      rows={4}
                      className="resize-none bg-background"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Payment Settings */}
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Pagos y Cuentas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Métodos de Pago Aceptados</Label>
                    <RadioGroup
                      value={paymentMethods}
                      onValueChange={(value: 'advance_only' | 'on_delivery' | 'both') => setPaymentMethods(value)}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                      <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent ${paymentMethods === 'advance_only' ? 'border-primary bg-primary/5' : ''}`}>
                        <RadioGroupItem value="advance_only" id="advance_only" />
                        <Label htmlFor="advance_only" className="cursor-pointer">Solo Anticipado</Label>
                      </div>
                      <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent ${paymentMethods === 'on_delivery' ? 'border-primary bg-primary/5' : ''}`}>
                        <RadioGroupItem value="on_delivery" id="on_delivery" />
                        <Label htmlFor="on_delivery" className="cursor-pointer">Contra Entrega</Label>
                      </div>
                      <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent ${paymentMethods === 'both' ? 'border-primary bg-primary/5' : ''}`}>
                        <RadioGroupItem value="both" id="both" />
                        <Label htmlFor="both" className="cursor-pointer">Ambos</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Cuentas Bancarias</Label>
                      <Button variant="outline" size="sm" onClick={addPaymentAccount}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar
                      </Button>
                    </div>

                    {paymentAccounts.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                        No hay cuentas configuradas
                      </div>
                    )}

                    <div className="grid gap-4">
                      {paymentAccounts.map((account, index) => (
                        <div key={index} className="flex gap-3 items-start p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow">
                          <div className="grid gap-3 flex-1 md:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Banco</Label>
                              <Input
                                value={account.bank}
                                onChange={(e) => updatePaymentAccount(index, 'bank', e.target.value)}
                                className="h-8"
                                placeholder="Nombre del banco"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Número</Label>
                              <Input
                                value={account.account}
                                onChange={(e) => updatePaymentAccount(index, 'account', e.target.value)}
                                className="h-8"
                                placeholder="0000000000"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Titular</Label>
                              <Input
                                value={account.name}
                                onChange={(e) => updatePaymentAccount(index, 'name', e.target.value)}
                                className="h-8"
                                placeholder="Nombre completo"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePaymentAccount(index)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-4"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Settings & Controls */}
          <div className="space-y-6">

            {/* Status Card */}
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 shadow-sm bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    Estado
                    {hasConfiguration ? (
                      <Badge className="bg-green-600 hover:bg-green-700">Activo</Badge>
                    ) : (
                      <Badge variant="secondary">Sin Configurar</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-muted-foreground">Último guardado:</span>
                    <span className="font-medium">
                      {saving ? 'Guardando...' : 'Hace un momento'}
                    </span>
                  </div>
                  {hasConfiguration && (
                    <Button
                      variant="outline"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm('¿Estás seguro de borrar toda la configuración?')) {
                          setStoreInfo('');
                          setSalesMode('advise_only');
                          setPaymentAccounts([]);
                          setPaymentMethods('both');
                          setAgentName('Asistente Virtual');
                          setProactivityLevel('reactive');
                          setCustomerTreatment('tu');
                          setWelcomeMessage('Hola! Soy tu asistente virtual, ¿en qué puedo ayudarte hoy?');
                          setCallToAction('¿Te gustaría que procese tu pedido?');
                          setSpecialInstructions('');
                          setWebsite('');
                          setNewCustomerAgentEnabled(true);
                          setDisableAgentOnManualReply(true);
                          setAutoReactivationEnabled(true);
                          setAutoReactivationHours(24);
                          setNotificationPhone('');
                          setMessageBufferSeconds(3);
                          setHasConfiguration(false);
                        }
                      }}
                    >
                      Resetear Configuración
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Behavior Settings */}
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5 text-primary" />
                    Comportamiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Modo de Venta</Label>
                    <RadioGroup value={salesMode} onValueChange={(value: 'advise_only' | 'complete_sale') => setSalesMode(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="advise_only" id="mode_advise" />
                        <Label htmlFor="mode_advise">Solo Asesorar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="complete_sale" id="mode_complete" />
                        <Label htmlFor="mode_complete">Cerrar Ventas</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Proactividad</Label>
                    <RadioGroup value={proactivityLevel} onValueChange={(value: 'reactive' | 'proactive') => setProactivityLevel(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="reactive" id="level_reactive" />
                        <Label htmlFor="level_reactive">Reactivo (Espera)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="proactive" id="level_proactive" />
                        <Label htmlFor="level_proactive">Proactivo (Propone)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex-1 cursor-pointer" htmlFor="newCustomer">Atender Nuevos</Label>
                      <Switch
                        id="newCustomer"
                        checked={newCustomerAgentEnabled}
                        onCheckedChange={setNewCustomerAgentEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="flex-1 cursor-pointer" htmlFor="manualReply">Pausar al Intervenir</Label>
                      <Switch
                        id="manualReply"
                        checked={disableAgentOnManualReply}
                        onCheckedChange={setDisableAgentOnManualReply}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Advanced Settings */}
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-primary" />
                    Avanzado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Buffer de Mensajes</Label>
                      <span className="text-sm text-muted-foreground">{messageBufferSeconds}s</span>
                    </div>
                    <Input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={messageBufferSeconds}
                      onChange={(e) => setMessageBufferSeconds(parseInt(e.target.value))}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tiempo de espera para agrupar mensajes consecutivos del cliente.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>Auto-reactivación (Horas)</Label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={autoReactivationEnabled}
                        onCheckedChange={setAutoReactivationEnabled}
                      />
                      <Input
                        type="number"
                        min="1"
                        value={autoReactivationHours}
                        onChange={(e) => setAutoReactivationHours(parseInt(e.target.value))}
                        disabled={!autoReactivationEnabled}
                        className="w-24"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Teléfono Notificaciones</Label>
                    <Input
                      value={notificationPhone}
                      onChange={(e) => setNotificationPhone(e.target.value)}
                      placeholder="+57..."
                      className="bg-background"
                    />
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