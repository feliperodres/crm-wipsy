import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trackPurchase } from '@/utils/metaPixel';
import { trackPlaceAnOrder, identifyUser } from '@/utils/tiktokPixel';
import { supabase } from '@/integrations/supabase/client';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const trackPurchaseEvents = async () => {
      // Get current user for identification
      const { data: { user } } = await supabase.auth.getUser();
      
      // Identify user for TikTok Pixel
      if (user?.email) {
        await identifyUser({
          email: user.email,
          externalId: user.id
        });
      }
      
      // Track purchase event
      const selectedPlan = localStorage.getItem('selectedPlan');
      if (selectedPlan && sessionId) {
        // Map plan IDs to values
        const planValues: Record<string, number> = {
          'starter': 9,
          'pro': 49,
          'business': 99
        };
        
        const planNames: Record<string, string> = {
          'starter': 'Starter',
          'pro': 'Pro',
          'business': 'Business'
        };
        
        const value = planValues[selectedPlan] || 0;
        const planName = planNames[selectedPlan] || selectedPlan;
        
        trackPurchase(selectedPlan, planName, value, sessionId);
        trackPlaceAnOrder(selectedPlan, planName, value, sessionId);
      }
    };
    
    trackPurchaseEvents();
    
    // Auto-redirect después de 5 segundos
    const timer = setTimeout(() => {
      navigate('/settings');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate, sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">¡Suscripción Exitosa!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Tu suscripción ha sido activada correctamente. Ya puedes disfrutar de todos los beneficios de tu nuevo plan.
          </p>
          
          {sessionId && (
            <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              ID de Sesión: {sessionId}
            </p>
          )}
          
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/settings')} 
              className="w-full"
            >
              Ir a Configuración
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Ir al Dashboard
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Serás redirigido automáticamente en 5 segundos...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;