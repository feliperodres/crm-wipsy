import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ShopifyIntegrationForm } from '@/components/integrations/ShopifyIntegrationForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const Integrations = () => {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check for OAuth status in URL params
    const params = new URLSearchParams(window.location.search);
    const status = params.get('oauth_status');
    const message = params.get('oauth_message');

    if (status && message) {
      if (status === 'success') {
        toast.success(message);
      } else {
        toast.error(message);
      }
      // Clean up URL
      window.history.replaceState({}, '', '/integrations');
    }

    // Listen for popup messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'shopify-oauth') {
        if (event.data.status === 'success') {
          toast.success(event.data.message);
          // Refresh the page to show the new integration
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.error(event.data.message);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleOAuthConnect = async () => {
    const shop = prompt('Ingresa tu dominio de Shopify (ej: mitienda.myshopify.com)');
    
    if (!shop) return;

    // Validate shop domain format
    if (!shop.endsWith('.myshopify.com')) {
      toast.error('El dominio debe terminar en .myshopify.com');
      return;
    }

    if (!user) {
      toast.error('Debes iniciar sesión primero');
      return;
    }

    setIsConnecting(true);

    try {
      // Call edge function to get OAuth URL
      const { data, error } = await supabase.functions.invoke('shopify-oauth-begin', {
        body: { shop }
      });

      if (error) throw error;
      
      if (!data?.url) {
        throw new Error('No OAuth URL received');
      }

      // Open OAuth flow in popup
      const width = 600;
      const height = 700;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;
      
      const popup = window.open(
        data.url,
        'shopify-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=yes`
      );

      if (!popup) {
        toast.error('Por favor, permite las ventanas emergentes para conectar con Shopify');
        setIsConnecting(false);
        return;
      }

      // Monitor popup closure
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
        }
      }, 500);

    } catch (error) {
      console.error('Error connecting to Shopify:', error);
      toast.error('Error al conectar con Shopify');
      setIsConnecting(false);
    }
  };

  const handleSuccess = (data: any) => {
    console.log('Integration successful:', data);
    toast.success('Integración configurada correctamente');
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Integraciones
          </h1>
          <p className="text-muted-foreground mt-2">
            Conecta tu negocio con plataformas externas para sincronizar datos y automatizar procesos
          </p>
        </div>

        {/* OAuth Connection Card - Prominent */}
        <Card className="p-8 mb-8 border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.373 12.736l-2.023 2.02 6.373.886-3.367-7.658-.983 4.752zM10.577 1.984L2.62 9.04l4.86.676L10.577 1.984zM11.45 9.548L9.573 5.032l-2.89 3.845 4.767.671zM9.49 19.037l2.957-2.952-2.57-.356.112 3.308zM8.12 17.692l-.112-3.308L4.74 13.93l3.38 3.762zM17.227 13.543l.983-4.752L15.24 1.136l-1.94 8.85 3.927.557zM13.143 10.38l1.94-8.85H10.89l2.253 8.85zM8.007 9.716l4.767.671L11.45 9.548 8.007 9.716zm.463 9.321l3.38-3.762 2.57.356-5.95 3.406zM3.61 11.45l1.13 2.48 4.267-.453-5.397-2.027zm13.617 2.086l6.373.886-8.083-4.606 1.71 3.72z"/>
              </svg>
              <h2 className="text-2xl font-bold">Conectar con Shopify</h2>
            </div>
            <p className="text-muted-foreground max-w-xl">
              Conecta tu tienda de Shopify de forma automática y segura. Sincroniza productos, 
              inventarios y órdenes automáticamente.
            </p>
            <Button
              size="lg"
              onClick={handleOAuthConnect}
              disabled={isConnecting}
              className="mt-4 h-14 px-8 text-lg font-semibold"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  🔗 Conectar con Shopify (Recomendado)
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Se abrirá una ventana de Shopify para autorizar la conexión
            </p>
          </div>
        </Card>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 border-t border-border" />
          <span className="text-sm text-muted-foreground font-medium">
            O conectar manualmente
          </span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Manual Connection Form */}
        <ShopifyIntegrationForm onSuccess={handleSuccess} />
      </div>
    </DashboardLayout>
  );
};

export default Integrations;