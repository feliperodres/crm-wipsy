import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Store, Key, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ShopifyImportSteps } from './ShopifyImportSteps';

const formSchema = z.object({
  shopDomain: z
    .string()
    .min(1, 'El dominio de la tienda es requerido')
    .refine(
      (value) => value.includes('.myshopify.com'),
      'El dominio debe incluir .myshopify.com'
    ),
  accessToken: z
    .string()
    .min(1, 'El access token es requerido')
    .refine(
      (value) => value.startsWith('shpat_'),
      'El access token debe empezar con shpat_'
    ),
});

type FormData = z.infer<typeof formSchema>;

interface ShopifyIntegrationFormProps {
  onSuccess?: (data: any) => void;
}

export function ShopifyIntegrationForm({ onSuccess }: ShopifyIntegrationFormProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [webhookStatus, setWebhookStatus] = useState<{
    configured: boolean;
    ordersWebhook: boolean;
    productsWebhook: boolean;
  } | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  const shopDomain = watch('shopDomain');
  const accessToken = watch('accessToken');

  // Check for existing integrations on component mount
  useEffect(() => {
    const checkExistingIntegration = async () => {
      try {
        const { data: integrations, error } = await supabase
          .from('shopify_integrations')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error checking integrations:', error);
          return;
        }

        if (integrations && integrations.length > 0) {
          const integration = integrations[0];
          
          // Set webhook status
          setWebhookStatus({
            configured: integration.webhook_configured || false,
            ordersWebhook: !!integration.webhook_id_orders,
            productsWebhook: !!integration.webhook_id_products,
          });
          
          // Simulate the connection success state
          const successData = {
            success: true,
            shop: {
              name: integration.shop_domain.replace('.myshopify.com', ''),
              domain: integration.shop_domain,
              email: '' // We don't store email in integrations table
            },
            integration_id: integration.id,
            access_token: 'existing_token' // We'll use the encrypted token from DB
          };
          
          setConnectionSuccess(successData);
          toast({
            title: '🔗 Integración existente encontrada',
            description: `Tu tienda "${integration.shop_domain}" ya está conectada.`,
          });
        }
      } catch (error) {
        console.error('Error loading integrations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingIntegration();
  }, [toast]);

  const validateShopDomain = (value: string) => {
    if (!value) return true;
    return value.includes('.myshopify.com') || 'Debe incluir .myshopify.com';
  };

  const validateAccessToken = (value: string) => {
    if (!value) return true;
    return value.startsWith('shpat_') || 'Debe empezar con shpat_';
  };

  const onSubmit = async (data: FormData) => {
    setIsConnecting(true);
    setConnectionError(null);
    setConnectionSuccess(null);

    try {
      const { data: response, error } = await supabase.functions.invoke(
        'validate-shopify-credentials',
        {
          body: {
            shopDomain: data.shopDomain,
            accessToken: data.accessToken,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (response.success) {
        // Add the access token to the response so we can use it later
        const successData = {
          ...response,
          access_token: data.accessToken
        };
        setConnectionSuccess(successData);
        toast({
          title: '🎉 ¡Conexión exitosa!',
          description: `Tu tienda "${response.shop.name}" ha sido conectada correctamente.`,
        });
        onSuccess?.(successData);
      } else {
        setConnectionError(response.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      const errorMessage = error.message || 'Error al conectar con Shopify';
      setConnectionError(errorMessage);
      toast({
        title: 'Error de conexión',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const testConnection = async () => {
    if (!shopDomain || !accessToken) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa ambos campos antes de probar la conexión.',
        variant: 'destructive',
      });
      return;
    }

    const domainValid = validateShopDomain(shopDomain);
    const tokenValid = validateAccessToken(accessToken);

    if (domainValid !== true || tokenValid !== true) {
      toast({
        title: 'Validación fallida',
        description: 'Por favor corrige los errores antes de continuar.',
        variant: 'destructive',
      });
      return;
    }

    await onSubmit({ shopDomain, accessToken });
  };

  // Show loading while checking existing integrations
  if (isLoading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Verificando integraciones existentes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (connectionSuccess) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Webhook Status Card */}
        {webhookStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Estado de Webhooks
              </CardTitle>
              <CardDescription>
                Estado de la sincronización automática con Shopify
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border ${webhookStatus.configured ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center gap-2">
                    {webhookStatus.configured ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                    <span className="font-medium">Webhooks Configurados</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {webhookStatus.configured ? 'Activos' : 'Pendientes'}
                  </p>
                </div>
                
                <div className={`p-4 rounded-lg border ${webhookStatus.ordersWebhook ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    {webhookStatus.ordersWebhook ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium">Órdenes</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {webhookStatus.ordersWebhook ? 'Sincronización automática' : 'No configurado'}
                  </p>
                </div>
                
                <div className={`p-4 rounded-lg border ${webhookStatus.productsWebhook ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    {webhookStatus.productsWebhook ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium">Productos</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {webhookStatus.productsWebhook ? 'Sincronización automática' : 'No configurado'}
                  </p>
                </div>
              </div>
              
              {(!webhookStatus.configured || !webhookStatus.ordersWebhook || !webhookStatus.productsWebhook) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Los webhooks permiten que las órdenes y productos se sincronicen automáticamente desde Shopify. 
                    Se configurarán automáticamente durante la importación.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Botón destacado para desconectar */}
        <Card className="border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Tienda conectada</h3>
                <p className="text-sm text-muted-foreground">
                  {connectionSuccess.shop.domain}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await supabase
                      .from('shopify_integrations')
                      .update({ is_active: false })
                      .eq('shop_domain', connectionSuccess.shop.domain)
                      .eq('is_active', true);
                    
                    toast({
                      title: 'Integración desconectada',
                      description: 'Tu tienda de Shopify ha sido desconectada correctamente',
                    });
                    
                    setConnectionSuccess(null);
                    setConnectionError(null);
                    setWebhookStatus(null);
                  } catch (error) {
                    toast({
                      title: 'Error al desconectar',
                      description: 'Intenta nuevamente',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                Desconectar tienda
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Import Steps */}
        <ShopifyImportSteps 
          shopData={connectionSuccess.shop}
          shopDomain={connectionSuccess.shop.domain}
          accessToken={connectionSuccess.access_token}
          onComplete={() => {
            setConnectionSuccess(null);
            setConnectionError(null);
            setWebhookStatus(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Integración con Shopify
          </CardTitle>
          <CardDescription>
            Conecta tu tienda de Shopify para sincronizar productos, pedidos y inventario
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopDomain" className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                Nombre de tu tienda Shopify
              </Label>
              <Input
                id="shopDomain"
                placeholder="mitienda.myshopify.com"
                {...register('shopDomain')}
                className={errors.shopDomain ? 'border-destructive' : ''}
              />
              {errors.shopDomain && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.shopDomain.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Ingresa el dominio completo de tu tienda
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Access Token
              </Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="shpat_..."
                {...register('accessToken')}
                className={errors.accessToken ? 'border-destructive' : ''}
              />
              {errors.accessToken && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.accessToken.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Token de acceso de tu app privada
              </p>
            </div>

            {connectionError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{connectionError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={isConnecting || !isValid}
                className="flex-1"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Probando conexión...
                  </>
                ) : (
                  'Probar conexión'
                )}
              </Button>
              <Button
                type="submit"
                disabled={isConnecting || !isValid}
                className="flex-1"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  'Conectar Tienda'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Instrucciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="instructions">
              <AccordionTrigger>
                📋 ¿Cómo obtener mis credenciales?
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <ol className="space-y-3">
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                      <span>Ve a tu Admin de Shopify</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                      <span>Navega a <strong>Settings → Apps and sales channels</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                      <span>Haz clic en <strong>"Develop apps"</strong> → <strong>"Create an app"</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                      <span>Dale un nombre a tu app y créala</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
                      <div>
                        <span>Configura los permisos (scopes):</span>
                        <ul className="mt-2 ml-4 space-y-1">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-success" />
                            <code className="text-xs bg-muted px-1 rounded">read_products</code>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-success" />
                            <code className="text-xs bg-muted px-1 rounded">read_orders</code>
                          </li>
                        </ul>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">6</span>
                      <span>Instala la app en tu tienda</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">7</span>
                      <span>Copia el <strong>"Admin API access token"</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">8</span>
                      <span>Pégalo en el campo Access Token arriba</span>
                    </li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}