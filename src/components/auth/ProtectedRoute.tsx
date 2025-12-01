import { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, session } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    if (user) {
      checkOnboarding();
    }
  }, [user]);

  const checkOnboarding = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setOnboardingCompleted(data?.onboarding_completed || false);
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setOnboardingCompleted(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  // Si está cargando, mostrar spinner
  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-slate-50 dark:to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario o sesión, redirigir a auth
  if (!user || !session) {
    return <Navigate to="/auth" replace />;
  }

  // Si el usuario no ha completado onboarding, redirigir (permitimos paso si acaba de completar)
  const justCompleted = (() => { try { return sessionStorage.getItem('onboardingCompleted') === '1'; } catch { return false; } })();
  if (!onboardingCompleted && !justCompleted && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};