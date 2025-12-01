import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  Loader2, 
  RefreshCw, 
  ShoppingCart, 
  Package, 
  Webhook,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ShopData {
  name: string;
  domain: string;
  email?: string;
}

interface ShopifyImportStepsProps {
  shopData: ShopData;
  shopDomain: string;
  accessToken: string;
  onComplete?: () => void;
}

interface StepState {
  status: 'pending' | 'loading' | 'success' | 'error';
  count: number;
  message: string;
}

interface ImportSteps {
  orders: StepState;
  products: StepState;
  webhook: StepState;
}

export function ShopifyImportSteps({ 
  shopData, 
  shopDomain, 
  accessToken, 
  onComplete 
}: ShopifyImportStepsProps) {
  const [steps, setSteps] = useState<ImportSteps>({
    orders: {
      status: 'pending',
      count: 0,
      message: 'Últimos 10 días'
    },
    products: {
      status: 'pending',
      count: 0,
      message: 'Todos los productos'
    },
    webhook: {
      status: 'pending',
      count: 0,
      message: 'Nuevos pedidos automáticos'
    }
  });

  const { toast } = useToast();

  // Asegura sesión válida y reintenta si hay error de relay/edge
  const invokeWithSession = async (fnName: string, body: any) => {
    const { data: sessionRes } = await supabase.auth.getSession();
    const session = sessionRes?.session;
    if (!session) {
      throw new Error('Sesión expirada. Vuelve a iniciar sesión e inténtalo nuevamente.');
    }

    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;
      return data as any;
    } catch (err: any) {
      // Errores típicos cuando el cliente no logra enviar la solicitud a la Edge Function
      if (err?.message?.includes('Failed to send a request') || err?.name === 'FunctionsRelayError') {
        // Intento de refrescar la sesión y reintento una vez
        await supabase.auth.refreshSession();
        const { data: sessionRes2 } = await supabase.auth.getSession();
        if (!sessionRes2?.session) throw err;
        const { data, error } = await supabase.functions.invoke(fnName, { body });
        if (error) throw error;
        return data as any;
      }
      throw err;
    }
  };

  const updateStep = (step: keyof ImportSteps, updates: Partial<StepState>) => {
    setSteps(prev => ({
      ...prev,
      [step]: { ...prev[step], ...updates }
    }));
  };

  const importRecentOrders = async () => {
    updateStep('orders', { 
      status: 'loading', 
      message: 'Importando pedidos...' 
    });

    try {
      // If we have an existing token, get it from the database
      const { data: integration } = await supabase
        .from('shopify_integrations')
        .select('access_token_encrypted')
        .eq('shop_domain', shopDomain)
        .eq('is_active', true)
        .maybeSingle();

      const tokenToUse = accessToken === 'existing_token' ? 
        integration?.access_token_encrypted : accessToken;

      const data = await invokeWithSession('shopify-import-orders', {
        shopDomain,
        accessToken: tokenToUse,
        daysBack: 10
      });


      if (data.success) {
        updateStep('orders', {
          status: 'success',
          count: data.count,
          message: `${data.count} pedidos importados`
        });
        
        toast({
          title: '✅ Pedidos importados',
          description: `Se importaron ${data.count} pedidos de los últimos 10 días`,
        });
      } else {
        throw new Error(data.error || 'Error al importar pedidos');
      }
    } catch (error: any) {
      console.error('Error importing orders:', error);
      updateStep('orders', {
        status: 'error',
        count: 0,
        message: 'Error al importar pedidos'
      });
      
      toast({
        title: 'Error al importar pedidos',
        description: error.message || 'Intenta nuevamente',
        variant: 'destructive',
      });
    }
  };

  const importAllProducts = async () => {
    updateStep('products', { 
      status: 'loading', 
      message: 'Importando productos...' 
    });

    try {
      // If we have an existing token, get it from the database
      const { data: integration } = await supabase
        .from('shopify_integrations')
        .select('access_token_encrypted')
        .eq('shop_domain', shopDomain)
        .eq('is_active', true)
        .maybeSingle();

      const tokenToUse = accessToken === 'existing_token' ? 
        integration?.access_token_encrypted : accessToken;

      const data = await invokeWithSession('shopify-import-products', {
        shopDomain,
        accessToken: tokenToUse
      });


      if (data.success) {
        updateStep('products', {
          status: 'success',
          count: data.count,
          message: `${data.count} productos importados`
        });
        
        toast({
          title: '✅ Productos importados',
          description: `Se importaron ${data.count} productos de tu tienda`,
        });
      } else {
        throw new Error(data.error || 'Error al importar productos');
      }
    } catch (error: any) {
      console.error('Error importing products:', error);
      updateStep('products', {
        status: 'error',
        count: 0,
        message: 'Error al importar productos'
      });
      
      toast({
        title: 'Error al importar productos',
        description: error.message || 'Intenta nuevamente',
        variant: 'destructive',
      });
    }
  };

  const setupWebhook = async () => {
    updateStep('webhook', { 
      status: 'loading', 
      message: 'Configurando webhook...' 
    });

    try {
      // If we have an existing token, get it from the database
      const { data: integration } = await supabase
        .from('shopify_integrations')
        .select('access_token_encrypted')
        .eq('shop_domain', shopDomain)
        .eq('is_active', true)
        .maybeSingle();

      const tokenToUse = accessToken === 'existing_token' ? 
        integration?.access_token_encrypted : accessToken;

      const { data, error } = await supabase.functions.invoke('shopify-setup-webhook', {
        body: {
          shopDomain,
          accessToken: tokenToUse
        }
      });

      if (error) throw error;

      if (data.success) {
        updateStep('webhook', {
          status: 'success',
          count: 1,
          message: 'Webhook configurado correctamente'
        });
        
        toast({
          title: '✅ Webhook configurado',
          description: 'Los nuevos pedidos aparecerán automáticamente',
        });
      } else {
        throw new Error(data.error || 'Error al configurar webhook');
      }
    } catch (error: any) {
      console.error('Error setting up webhook:', error);
      updateStep('webhook', {
        status: 'error',
        count: 0,
        message: 'Error al configurar webhook'
      });
      
      toast({
        title: 'Error al configurar webhook',
        description: error.message || 'Intenta nuevamente',
        variant: 'destructive',
      });
    }
  };

  const getStepIcon = (stepData: StepState) => {
    switch (stepData.status) {
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStepBadge = (stepData: StepState) => {
    switch (stepData.status) {
      case 'loading':
        return <Badge variant="outline" className="text-primary border-primary">Importando...</Badge>;
      case 'success':
        return <Badge className="bg-success/10 text-success border-success">Completado</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  const getButtonContent = (stepData: StepState, defaultText: string) => {
    switch (stepData.status) {
      case 'loading':
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Importando...
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="w-4 h-4" />
            Completado ({stepData.count})
          </>
        );
      case 'error':
        return (
          <>
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </>
        );
      default:
        return defaultText;
    }
  };

  const isAllCompleted = Object.values(steps).every(step => step.status === 'success');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <CardTitle className="text-2xl">
            🎉 ¡Tienda conectada exitosamente!
          </CardTitle>
          <p className="text-muted-foreground">
            <strong>{shopData.name}</strong> está lista para sincronizar
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            📊 Importar datos de tu tienda
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Importa tus datos existentes y configura la sincronización automática
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Paso 1: Pedidos */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Paso 1: Pedidos recientes</h3>
                  {getStepBadge(steps.orders)}
                </div>
                {getStepIcon(steps.orders)}
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                📋 {steps.orders.message}
              </p>

              <Button
                onClick={importRecentOrders}
                disabled={steps.orders.status === 'loading' || steps.orders.status === 'success'}
                className="w-full sm:w-auto"
                size="sm"
              >
                {getButtonContent(steps.orders, '⏳ Importar Pedidos')}
              </Button>
            </CardContent>
          </Card>

          {/* Paso 2: Productos */}
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold">Paso 2: Productos</h3>
                  {getStepBadge(steps.products)}
                </div>
                {getStepIcon(steps.products)}
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                📦 {steps.products.message}
              </p>

              <Button
                onClick={importAllProducts}
                disabled={steps.products.status === 'loading' || steps.products.status === 'success'}
                className="w-full sm:w-auto"
                size="sm"
                variant="outline"
              >
                {getButtonContent(steps.products, '⏳ Importar Productos')}
              </Button>
            </CardContent>
          </Card>

          {/* Paso 3: Webhook */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Webhook className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold">Paso 3: Sincronización</h3>
                  {getStepBadge(steps.webhook)}
                </div>
                {getStepIcon(steps.webhook)}
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                🔔 {steps.webhook.message}
              </p>

              <Button
                onClick={setupWebhook}
                disabled={steps.webhook.status === 'loading' || steps.webhook.status === 'success'}
                className="w-full sm:w-auto"
                size="sm"
                variant="outline"
              >
                {getButtonContent(steps.webhook, '⏳ Configurar Webhook')}
              </Button>
            </CardContent>
          </Card>

          {/* Mensaje final cuando todo está completo */}
          {isAllCompleted && (
            <Card className="border-success bg-success/5">
              <CardContent className="p-6 text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      🎉 ¡Importación completada!
                    </h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>✅ {steps.orders.count} pedidos de últimos 10 días</p>
                      <p>✅ {steps.products.count} productos importados</p>
                      <p>✅ Webhook configurado</p>
                    </div>
                  </div>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Tu tienda Shopify está sincronizada con Wafy. 
                      Los nuevos pedidos aparecerán automáticamente.
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button 
                      onClick={() => window.location.href = '/'}
                      className="flex items-center gap-2"
                    >
                      Ver Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = '/products'}
                    >
                      Ver Productos
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = '/orders'}
                    >
                      Ver Pedidos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botón para desconectar integración */}
          <div className="flex justify-center pt-4">
            <Button
              variant="ghost" 
              onClick={async () => {
                try {
                  await supabase
                    .from('shopify_integrations')
                    .update({ is_active: false })
                    .eq('shop_domain', shopDomain)
                    .eq('is_active', true);
                  
                  toast({
                    title: 'Integración desconectada',
                    description: 'Puedes volver a conectar tu tienda cuando quieras',
                  });
                  
                  onComplete?.();
                } catch (error) {
                  toast({
                    title: 'Error al desconectar',
                    description: 'Intenta nuevamente',
                    variant: 'destructive',
                  });
                }
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              Desconectar integración
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}