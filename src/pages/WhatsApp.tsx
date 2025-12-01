import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Copy, Check, Settings, Webhook, MessageSquare, Link as LinkIcon, ArrowLeft, Plus, Trash2, Edit, Info, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface WhatsAppInstance {
  id: string;
  api_url: string;
  api_key: string;
  instance_name: string;
  display_name?: string;
  status: string;
  is_default?: boolean;
}

interface WhatsAppMetaCredentials {
  id: string;
  phone_number_id: string;
  phone_number: string;
  business_name: string;
  status: string;
  is_default: boolean;
  webhook_url: string;
  verify_token: string;
}

const WhatsApp = () => {
  const [selectedOption, setSelectedOption] = useState<'official' | 'external' | null>(null);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [metaCredentials, setMetaCredentials] = useState<WhatsAppMetaCredentials[]>([]);
  const [editingInstance, setEditingInstance] = useState<WhatsAppInstance | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [metaWebhookUrl, setMetaWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.email) {
      const base = btoa(user.email);
      const hash = base.replace(/[+/=]/g, '').substring(0, 16);
      setWebhookUrl(`https://fczgowziugcvrpgfelks.supabase.co/functions/v1/whatsapp-webhook?user=${hash}`);
      setMetaWebhookUrl(`https://fczgowziugcvrpgfelks.supabase.co/functions/v1/whatsapp-meta-webhook`);
      loadInstances();
    }
    
    // Detectar si se completó exitosamente el registro
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      const phone = urlParams.get('phone');
      toast({
        title: "¡Conexión exitosa!",
        description: phone ? `Número conectado: ${phone}` : "WhatsApp conectado exitosamente",
      });
      // Limpiar parámetros de la URL
      window.history.replaceState({}, '', '/whatsapp');
      // Recargar credenciales
      loadInstances();
    } else if (urlParams.get('error')) {
      toast({
        title: "Error al conectar",
        description: urlParams.get('error') || "Ocurrió un error durante la conexión",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/whatsapp');
    }
  }, [user]);

  const loadInstances = async () => {
    try {
      console.log('Loading WhatsApp instances...');
      
      // Cargar instancias externas
      const { data: externalData, error: externalError } = await supabase
        .from('whatsapp_evolution_credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (externalError) {
        console.error('Error loading external instances:', externalError);
        throw externalError;
      }

      // Cargar credenciales de Meta
      const { data: metaData, error: metaError } = await supabase
        .from('whatsapp_meta_credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (metaError) {
        console.error('Error loading Meta credentials:', metaError);
        throw metaError;
      }

      console.log('External instances:', externalData);
      console.log('Meta credentials:', metaData);

      setInstances(externalData || []);
      setMetaCredentials(metaData || []);
      
    } catch (error) {
      console.error('Error loading instances:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las credenciales de WhatsApp",
        variant: "destructive",
      });
    }
  };

  // Si ya hay credenciales o instancias, mostrar automáticamente la vista de gestión
  useEffect(() => {
    if (!selectedOption && (metaCredentials.length > 0 || instances.length > 0)) {
      setSelectedOption('official');
    }
  }, [metaCredentials, instances]);

  const handleAddNew = () => {
    setEditingInstance(null);
    setApiUrl("");
    setApiKey("");
    setInstanceName("");
    setDisplayName("");
    setShowForm(true);
  };

  const handleEdit = (instance: WhatsAppInstance) => {
    setEditingInstance(instance);
    setApiUrl(instance.api_url);
    setApiKey(instance.api_key);
    setInstanceName(instance.instance_name);
    setDisplayName(instance.display_name || "");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta instancia?")) return;
    
    try {
      const { error } = await supabase
        .from('whatsapp_evolution_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Instancia eliminada correctamente",
      });
      loadInstances();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingInstance(null);
    setApiUrl("");
    setApiKey("");
    setInstanceName("");
    setDisplayName("");
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast({
        title: "Copiado",
        description: "Webhook URL copiado al portapapeles",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar la URL",
        variant: "destructive",
      });
    }
  };

  const copyMetaWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(metaWebhookUrl);
      setCopiedMeta(true);
      toast({
        title: "Copiado",
        description: "Webhook URL de Meta copiado al portapapeles",
      });
      setTimeout(() => setCopiedMeta(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar la URL",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMeta = async (id: string) => {
    if (!confirm("¿Estás seguro de desconectar esta cuenta de WhatsApp?")) return;
    
    try {
      const { error } = await supabase
        .from('whatsapp_meta_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Conexión eliminada correctamente",
      });
      loadInstances();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMetaSignup = () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para conectar WhatsApp",
        variant: "destructive",
      });
      return;
    }

    const appId = import.meta.env.VITE_META_APP_ID;
    const configId = import.meta.env.VITE_META_CONFIG_ID;
    const redirectUri = `https://fczgowziugcvrpgfelks.supabase.co/functions/v1/whatsapp-meta-callback`;
    
    if (!appId || !configId) {
      toast({
        title: "Error de configuración",
        description: "Las credenciales de Meta no están configuradas",
        variant: "destructive",
      });
      return;
    }

    const state = user.id;
    
    // Parámetros extras para activar el onboarding de WhatsApp Business
    const extras = {
      featureType: "whatsapp_business_app_onboarding",
      sessionInfoVersion: "3",
      version: "v3"
    };
    
    const fbLoginUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}&` +
      `config_id=${configId}&` +
      `response_type=code&` +
      `scope=whatsapp_business_management,whatsapp_business_messaging&` +
      `extras=${encodeURIComponent(JSON.stringify(extras))}`;
    
    console.log('Opening Meta signup popup:', fbLoginUrl);
    
    const popup = window.open(
      fbLoginUrl,
      'meta-whatsapp-signup',
      'width=600,height=700,scrollbars=yes'
    );
    
    if (!popup) {
      toast({
        title: "Error",
        description: "No se pudo abrir la ventana de autorización. Verifica que los pop-ups estén habilitados.",
        variant: "destructive",
      });
      return;
    }
    
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        loadInstances();
        
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const error = urlParams.get('error');
        const phone = urlParams.get('phone');
        
        if (success === 'true') {
          toast({
            title: "¡Conexión exitosa!",
            description: phone ? `WhatsApp ${phone} conectado correctamente` : "WhatsApp conectado correctamente",
          });
          
          window.history.replaceState({}, '', '/whatsapp');
        } else if (error) {
          toast({
            title: "Error en la conexión",
            description: decodeURIComponent(error),
            variant: "destructive",
          });
          
          window.history.replaceState({}, '', '/whatsapp');
        }
      }
    }, 500);
  };

  const validateCredentials = async () => {
    if (!apiUrl || !apiKey || !instanceName) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return false;
    }

    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-evolution-credentials', {
        body: { apiUrl, apiKey, instanceName }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Éxito",
          description: "Credenciales válidas",
        });
        return true;
      } else {
        toast({
          title: "Error",
          description: data?.error || "Credenciales inválidas",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error validando credenciales: ${error.message}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setValidating(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!apiUrl || !apiKey || !instanceName) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    // Validar credenciales primero
    const isValid = await validateCredentials();
    if (!isValid) return;

    setLoading(true);
    try {
      if (editingInstance) {
        // Actualizar instancia existente
        const { error } = await supabase
          .from('whatsapp_evolution_credentials')
          .update({
            api_url: apiUrl.trim(),
            api_key: apiKey.trim(),
            instance_name: instanceName.trim(),
            display_name: displayName.trim() || null,
            status: 'active'
          })
          .eq('id', editingInstance.id);

        if (error) throw error;
      } else {
        // Crear nueva instancia
        const { error } = await supabase
          .from('whatsapp_evolution_credentials')
          .insert({
            user_id: user?.id,
            api_url: apiUrl.trim(),
            api_key: apiKey.trim(),
            instance_name: instanceName.trim(),
            display_name: displayName.trim() || null,
            status: 'active'
          });

        if (error) throw error;
      }

      toast({
        title: "Éxito",
        description: editingInstance ? "Instancia actualizada exitosamente" : "Instancia creada exitosamente",
      });
      
      handleCancelForm();
      loadInstances();
    } catch (error: any) {
      console.error('Error guardando instancia:', error);
      toast({
        title: "Error",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Si no hay opción seleccionada, mostrar las opciones
  if (!selectedOption) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Conectar WhatsApp</h1>
              <p className="text-muted-foreground">
                Selecciona el método de conexión que prefieras
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Opción WhatsApp Oficial */}
              <Card 
                className="p-6 hover:border-primary transition-colors cursor-pointer"
                onClick={() => setSelectedOption('official')}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <MessageSquare className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">WhatsApp Oficial</h3>
                      <p className="text-sm text-muted-foreground">API de Meta Business</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Conecta directamente con la API oficial de WhatsApp Business de Meta.
                  </p>
                  <Button className="w-full">
                    {metaCredentials.length > 0 ? 'Gestionar Conexiones' : 'Conectar Ahora'}
                  </Button>
                </div>
              </Card>

              {/* Opción Conexión Externa */}
              <Card 
                className="p-6 hover:border-primary transition-colors cursor-pointer"
                onClick={() => setSelectedOption('external')}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <LinkIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Conexión Externa</h3>
                      <p className="text-sm text-muted-foreground">API personalizada</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Conecta tu propia API de WhatsApp usando tu infraestructura
                  </p>
                  <Button className="w-full">
                    {instances.length > 0 ? 'Gestionar Conexiones' : 'Configurar'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Mostrar lista de instancias y formulario según la opción seleccionada
  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Botón para volver a las opciones */}
          <Button 
            variant="ghost" 
            className="gap-2"
            onClick={() => {
              setSelectedOption(null);
              setShowForm(false);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a opciones
          </Button>

          {/* Vista de WhatsApp Oficial */}
          {selectedOption === 'official' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">WhatsApp Oficial</h1>
                  <p className="text-muted-foreground">
                    Gestiona tus conexiones de WhatsApp Business oficiales
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/templates')} 
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Plantillas
                  </Button>
                  <Button onClick={handleMetaSignup} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Añadir Número
                  </Button>
                </div>
              </div>

              {/* Credenciales de Meta WhatsApp */}
              {metaCredentials.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Números Conectados</CardTitle>
                    <CardDescription>
                      Tus cuentas de WhatsApp Business oficiales
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {metaCredentials.map((cred) => (
                      <div
                        key={cred.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-green-600" />
                            <h3 className="font-semibold">
                              {cred.business_name}
                            </h3>
                            {cred.is_default && (
                              <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">
                                Predeterminada
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Teléfono: {cred.phone_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID: {cred.phone_number_id}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMeta(cred.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Información del Webhook de Meta */}
                    <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg space-y-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">Configuración del Webhook</h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            Debes configurar esta URL en Meta Dashboard → WhatsApp → Configuración → Webhook
                          </p>
                          <div className="flex gap-2">
                            <Input
                              value={metaWebhookUrl}
                              readOnly
                              className="font-mono text-xs bg-background"
                            />
                            <Button
                              onClick={copyMetaWebhookUrl}
                              variant="outline"
                              size="icon"
                            >
                              {copiedMeta ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Verify Token: Usa el que configuraste en los secretos (META_VERIFY_TOKEN)
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No hay números conectados</CardTitle>
                    <CardDescription>
                      Conecta tu primera cuenta de WhatsApp Business oficial
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleMetaSignup} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Conectar con Meta Business
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Vista de Conexiones Externas */}
          {selectedOption === 'external' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Conexiones Externas</h1>
                  <p className="text-muted-foreground">
                    Gestiona tus conexiones vía API externa
                  </p>
                </div>
                {!showForm && (
                  <Button onClick={handleAddNew} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva Conexión
                  </Button>
                )}
              </div>

          {/* Lista de instancias externas */}
          {!showForm && instances.length > 0 && selectedOption === 'external' && (
            <Card>
              <CardHeader>
                <CardTitle>Instancias Configuradas</CardTitle>
                <CardDescription>
                  Todas tus instancias comparten el mismo webhook
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {instances.map((instance) => (
                    <div
                      key={instance.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {instance.display_name || instance.instance_name}
                          </h3>
                          {instance.is_default && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              Predeterminada
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Instancia: {instance.instance_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {instance.api_url}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(instance)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(instance.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulario para crear/editar instancia */}
          {showForm && selectedOption === 'external' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelForm}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Button>
                <div>
                  <h2 className="text-xl font-bold">
                    {editingInstance ? "Editar Instancia" : "Nueva Instancia"}
                  </h2>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Credenciales de Conexión
                    </CardTitle>
                    <CardDescription>
                      Configura tu API externa
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiUrl">URL de API</Label>
                      <Input
                        id="apiUrl"
                        type="url"
                        placeholder="https://tu-api.com"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        URL base de tu API externa
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Tu API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Clave de autenticación de tu API
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instanceName">Nombre de Instancia *</Label>
                      <Input
                        id="instanceName"
                        placeholder="mi-instancia"
                        value={instanceName}
                        onChange={(e) => setInstanceName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Identificador único de la instancia en tu API
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="displayName">Nombre para Mostrar (Opcional)</Label>
                      <Input
                        id="displayName"
                        placeholder="Ej: WhatsApp Principal"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Nombre descriptivo para identificar esta instancia
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={validateCredentials}
                        disabled={validating || !apiUrl || !apiKey || !instanceName}
                        variant="outline"
                        className="flex-1"
                      >
                        {validating ? "Validando..." : "Probar Conexión"}
                      </Button>

                      <Button
                        onClick={handleSaveCredentials}
                        disabled={loading || !apiUrl || !apiKey || !instanceName}
                        className="flex-1"
                      >
                        {loading ? "Guardando..." : editingInstance ? "Actualizar" : "Guardar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Webhook className="h-5 w-5" />
                      Webhook URL
                    </CardTitle>
                    <CardDescription>
                      Configura este webhook en tu API
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tu Webhook URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={webhookUrl}
                          readOnly
                          className="font-mono text-xs bg-muted"
                        />
                        <Button
                          onClick={copyWebhookUrl}
                          variant="outline"
                          size="icon"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Todas las instancias usan el mismo webhook
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md space-y-2">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Eventos a configurar:
                      </p>
                      <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
                        <li>messages.upsert</li>
                        <li>messages.update</li>
                        <li>send.message</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {!showForm && selectedOption === 'external' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhook Compartido
                </CardTitle>
                <CardDescription>
                  Todas tus instancias usan el mismo webhook
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tu Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhookUrl}
                      readOnly
                      className="font-mono text-xs bg-muted"
                    />
                    <Button
                      onClick={copyWebhookUrl}
                      variant="outline"
                      size="icon"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WhatsApp;
