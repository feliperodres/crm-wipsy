import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnboardingWhatsAppProps {
  onNext: () => void;
}

export default function OnboardingWhatsApp({ onNext }: OnboardingWhatsAppProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);

  useEffect(() => {
    checkWhatsAppConnection();

    // Detectar si se completó exitosamente el registro desde URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      const phone = urlParams.get('phone');
      setIsConnected(true);
      setConnectedPhone(phone ? decodeURIComponent(phone) : null);
      toast.success(phone ? `Número conectado: ${decodeURIComponent(phone)}` : 'WhatsApp conectado exitosamente');
      // Limpiar URL sin recargar la página
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (urlParams.get('error')) {
      const errorMsg = urlParams.get('error');
      toast.error(errorMsg ? decodeURIComponent(errorMsg) : 'Error al conectar WhatsApp');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Listener para cambios en la URL (cuando el popup redirige)
  useEffect(() => {
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success') === 'true') {
        checkWhatsAppConnection();
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Polling para detectar conexión mientras el popup está abierto
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (loading) {
      // Verificar cada 2 segundos si se conectó mientras el popup está abierto
      intervalId = setInterval(() => {
        checkWhatsAppConnection();
      }, 2000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loading]);

  const checkWhatsAppConnection = async () => {
    if (!user) return;

    try {
      console.log('Checking WhatsApp connection for user:', user.id);

      // Intentar obtener el número predeterminado primero
      let { data, error } = await supabase
        .from('whatsapp_meta_credentials')
        .select('phone_number, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('is_default', true)
        .maybeSingle();

      // Si no hay predeterminado, obtener el más reciente
      if (!data) {
        const result = await supabase
          .from('whatsapp_meta_credentials')
          .select('phone_number, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        data = result.data;
        error = result.error;
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching credentials:', error);
        throw error;
      }

      console.log('WhatsApp credentials found:', data);

      if (data) {
        setIsConnected(true);
        setConnectedPhone(data.phone_number);
        setLoading(false);
        if (!checking) {
          toast.success(`WhatsApp conectado: ${data.phone_number}`);
        }
      }
    } catch (error) {
      console.error('Error checking WhatsApp connection:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleMetaSignup = () => {
    if (!user?.id) {
      toast.error('Error: Usuario no autenticado');
      return;
    }

    setLoading(true);

    const appId = import.meta.env.VITE_META_APP_ID;
    const configId = import.meta.env.VITE_META_CONFIG_ID;
    const redirectUri = `https://fczgowziugcvrpgfelks.supabase.co/functions/v1/whatsapp-meta-callback`;

    if (!appId || !configId) {
      toast.error('Error de configuración: Credenciales de Meta no configuradas');
      setLoading(false);
      return;
    }

    const state = user.id;

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

    const popup = window.open(
      fbLoginUrl,
      'meta-whatsapp-signup',
      'width=600,height=700,scrollbars=yes'
    );

    if (!popup) {
      toast.error('No se pudo abrir la ventana. Verifica que los pop-ups estén habilitados.');
      setLoading(false);
      return;
    }

    // Monitorear el cierre del popup
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        setLoading(false);
        // Verificar una última vez al cerrar el popup
        setTimeout(() => {
          checkWhatsAppConnection();
        }, 1000);
      }
    }, 500);
  };

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verificando conexión...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-green-500/10 rounded-full ring-1 ring-green-500/20">
            <MessageSquare className="h-12 w-12 text-green-500" />
          </div>
        </div>
        <h2 className="text-3xl font-bold !text-white">Conecta tu WhatsApp Business</h2>
        <p className="!text-slate-400 max-w-2xl mx-auto text-lg">
          Conecta tu cuenta de WhatsApp Business para recibir y responder mensajes de tus clientes.
          Puedes usar tu cuenta actual sin perder tu WhatsApp personal.
        </p>
      </div>

      {isConnected ? (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col items-center gap-4 p-8 bg-green-500/10 border border-green-500/20 rounded-2xl">
            <div className="p-3 bg-green-500/20 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white">¡WhatsApp conectado exitosamente!</h3>
              {connectedPhone && <p className="text-green-400 mt-1 font-mono">Número: {connectedPhone}</p>}
            </div>
          </div>
          <Button
            onClick={onNext}
            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20"
          >
            Continuar al siguiente paso
          </Button>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 space-y-4">
            <p className="text-lg font-medium text-blue-400 flex items-center gap-2">
              <span className="text-2xl">ℹ️</span> Información importante:
            </p>
            <ul className="text-slate-300 space-y-2 list-disc list-inside ml-2">
              <li>No perderás tu WhatsApp personal</li>
              <li>Necesitas una cuenta de WhatsApp Business</li>
              <li>El proceso es rápido y seguro</li>
            </ul>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={handleMetaSignup}
              disabled={loading}
              className="w-full h-14 text-lg bg-[#1877F2] hover:bg-[#1864D9] text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <MessageSquare className="h-6 w-6" />
                  Conectar con WhatsApp
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
