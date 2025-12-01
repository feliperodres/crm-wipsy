import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Store, Bot, Truck, CheckCircle2, Calendar, User, LayoutDashboard, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import OnboardingWhatsApp from '@/components/onboarding/OnboardingWhatsApp';
import OnboardingPlans from '@/components/onboarding/OnboardingPlans';
import OnboardingProducts from '@/components/onboarding/OnboardingProducts';
import OnboardingAgent from '@/components/onboarding/OnboardingAgent';
import OnboardingShipping from '@/components/onboarding/OnboardingShipping';
import OnboardingComplete from '@/components/onboarding/OnboardingComplete';
import OnboardingWelcome from '@/components/onboarding/OnboardingWelcome';
import OnboardingQuestionnaire from '@/components/onboarding/OnboardingQuestionnaire';
import ParticleBackground from '@/components/ui/ParticleBackground';
import nuevoLogo from '@/assets/nuevo-logo.png';

const STEPS = [
  { id: 1, title: 'Bienvenida', icon: LayoutDashboard, description: 'Inicio' },
  { id: 2, title: 'Perfil', icon: User, description: 'Cuéntanos de ti' },
  { id: 3, title: 'Conectar', icon: MessageSquare, description: 'WhatsApp' },
  { id: 4, title: 'Productos', icon: Store, description: 'Catálogo' },
  { id: 5, title: 'Agente', icon: Bot, description: 'Personalización' },
  { id: 6, title: 'Envíos', icon: Truck, description: 'Tarifas' },
  { id: 7, title: 'Planes', icon: CreditCard, description: 'Suscripción' },
  { id: 8, title: '¡Listo!', icon: CheckCircle2, description: 'Completado' }
];

const CALENDAR_URL = 'https://calendly.com/felipe-rodres/30min';

export default function Onboarding() {
  const { user } = useAuth();
  const useNavigateHook = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [agentMode, setAgentMode] = useState<'advise_only' | 'complete_sale'>('advise_only');

  useEffect(() => {
    loadOnboardingProgress();
  }, [user]);

  const loadOnboardingProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_current_step, onboarding_completed, ai_agent_mode')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Si ya completó el onboarding, redirigir al dashboard
      if (data?.onboarding_completed) {
        useNavigateHook('/dashboard');
        return;
      }

      // Restaurar paso actual
      if (data?.onboarding_current_step) {
        setCurrentStep(data.onboarding_current_step);
      }

      if (data?.ai_agent_mode) {
        setAgentMode(data.ai_agent_mode as 'advise_only' | 'complete_sale');
      }

    } catch (error) {
      console.error('Error loading onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (step: number, updates?: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_current_step: step,
          ...updates
        })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleNext = async (data?: any) => {
    // Verificar que data sea un objeto simple y no un evento
    const validData = data && typeof data === 'object' && !data.nativeEvent ? data : undefined;

    // Guardar datos específicos del paso si hay
    if (validData) {
      await saveProgress(currentStep, validData);
      if (validData.ai_agent_mode) {
        setAgentMode(validData.ai_agent_mode);
      }
    }

    if (currentStep < STEPS.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await saveProgress(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      saveProgress(prevStep);
    }
  };

  const handleSkip = async () => {
    // Permitir saltar cualquier paso excepto el último
    if (currentStep < STEPS.length) {
      await handleNext();
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_current_step: STEPS.length
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('¡Configuración completada! 🎉');
      setCurrentStep(STEPS.length);

      // Marcar en sessionStorage para evitar loops temporales de redirección
      try { sessionStorage.setItem('onboardingCompleted', '1'); } catch { }

      // Redirigir al dashboard inmediatamente (replace para evitar volver atrás)
      useNavigateHook('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Error al completar el onboarding');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <OnboardingWelcome onNext={() => handleNext()} />;
      case 2:
        return <OnboardingQuestionnaire onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <OnboardingWhatsApp onNext={() => handleNext()} />;
      case 4:
        return <OnboardingProducts onNext={() => handleNext()} onSkip={handleSkip} onBack={handleBack} />;
      case 5:
        return <OnboardingAgent onNext={handleNext} onBack={handleBack} />;
      case 6:
        return <OnboardingShipping onNext={completeOnboarding} onBack={handleBack} />;
      case 7:
        return <OnboardingPlans onNext={(planId) => handleNext({ selected_plan: planId })} />;
      case 8:
        return <OnboardingComplete />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-slate-50 dark:to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden font-sans selection:bg-blue-500/30 relative">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ParticleBackground />
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full opacity-30 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-black via-blue-900/5 to-transparent" />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 py-8 px-4 min-h-screen flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full space-y-8">

          {/* Header - Only show if not welcome screen */}
          {currentStep > 1 && (
            <div className="text-center space-y-6 animate-fade-in">
              <img
                src={nuevoLogo}
                alt="Logo"
                className="h-12 w-auto object-contain mx-auto"
              />
              <div className="space-y-2 max-w-md mx-auto">
                <Progress
                  value={progress}
                  className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-cyan-400"
                />    <div className="flex justify-between text-xs text-slate-400 font-medium uppercase tracking-wider">
                  <span>Paso {currentStep} de {STEPS.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Step Content Card */}
          <Card className="border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
            <CardContent className="p-8 md:p-12">
              {renderStep()}
            </CardContent>
          </Card>

          {/* Global Skip Button */}
          {currentStep > 1 && currentStep < STEPS.length && currentStep !== 7 && (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                Omitir este paso por ahora
              </Button>
            </div>
          )}

          {/* Help Button */}
          {currentStep < STEPS.length && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="bg-transparent border-white/10 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all rounded-full px-6"
              >
                <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
                  <Calendar className="h-4 w-4 mr-2" />
                  ¿Necesitas ayuda? Agenda una reunión
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
