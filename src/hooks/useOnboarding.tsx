import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  page: string;
  targetSelector?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'navigate' | 'highlight' | 'wait';
  nextPage?: string;
  optional?: boolean;
}

interface OnboardingContextType {
  isOnboarding: boolean;
  currentStep: number;
  currentStepData: OnboardingStep | null;
  totalSteps: number;
  startOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  isStepActive: (stepId: string) => boolean;
  triggerStepCompletion: (stepId: string) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '¡Bienvenido a Wipsy! 🎉',
    description: 'Te guiaremos paso a paso para configurar tu tienda y AI Agent. ¡Empezemos!',
    page: '/dashboard',
    position: 'center',
    action: 'wait'
  },
  {
    id: 'products-intro',
    title: 'Paso 1: Crear Productos 📦',
    description: 'Primero necesitas crear algunos productos para que tu AI Agent pueda ofrecerlos a los clientes.',
    page: '/dashboard',
    position: 'center',
    action: 'navigate',
    nextPage: '/products'
  },
  {
    id: 'create-product',
    title: 'Crea tu primer producto',
    description: 'Haz clic en "Nuevo Producto" y completa el formulario. Una vez creado tu producto, haz clic en "Siguiente" para continuar.',
    page: '/products',
    targetSelector: '[data-testid="new-product-button"]',
    position: 'left',
    action: 'highlight'
  },
  {
    id: 'products-completed',
    title: '¡Excelente! 🎯',
    description: 'Ya tienes productos en tu catálogo. Ahora vamos a conectar WhatsApp para que los clientes puedan contactarte.',
    page: '/products',
    position: 'center',
    action: 'navigate',
    nextPage: '/whatsapp'
  },
  {
    id: 'whatsapp-intro',
    title: 'Paso 2: Conectar WhatsApp 📱',
    description: 'Conecta tu número de WhatsApp Business para recibir mensajes de clientes.',
    page: '/whatsapp',
    position: 'center',
    action: 'wait'
  },
  {
    id: 'whatsapp-connect',
    title: 'Conecta tu WhatsApp',
    description: 'Ingresa tu número de WhatsApp en el formato correcto y haz clic en "Generar Código QR".',
    page: '/whatsapp',
    targetSelector: '[data-testid="whatsapp-connect-section"]',
    position: 'top',
    action: 'highlight'
  },
  {
    id: 'whatsapp-qr-scan',
    title: 'Escanea el Código QR 📱',
    description: 'Una vez generado el código QR, escanéalo con tu WhatsApp Business desde tu teléfono para completar la conexión.',
    page: '/whatsapp',
    targetSelector: '[data-testid="whatsapp-qr-section"]',
    position: 'left',
    action: 'highlight'
  },
  {
    id: 'ai-agent-intro',
    title: 'Paso 3: Configurar AI Agent 🤖',
    description: 'Ahora vamos a configurar tu asistente de IA para que atienda a tus clientes automáticamente.',
    page: '/whatsapp',
    position: 'center',
    action: 'navigate',
    nextPage: '/ai-agent'
  },
  {
    id: 'ai-agent-config',
    title: 'Configura tu AI Agent',
    description: 'Personaliza cómo tu AI Agent se presenta y responde a los clientes. Dale personalidad a tu asistente virtual.',
    page: '/ai-agent',
    targetSelector: '[data-testid="agent-config-section"]',
    position: 'right',
    action: 'highlight'
  },
  {
    id: 'test-agent-intro',
    title: 'Paso 4: Probar el Agent 💬 (Opcional)',
    description: '¡Perfecto! Si ya conectaste WhatsApp, puedes probar cómo funciona tu AI Agent enviando un mensaje de prueba. Si aún no, puedes saltar este paso.',
    page: '/ai-agent',
    position: 'center',
    action: 'navigate',
    nextPage: '/chats',
    optional: true
  },
  {
    id: 'test-chat',
    title: 'Envía un mensaje de prueba',
    description: 'Envía un mensaje a tu número de WhatsApp desde tu teléfono personal para ver cómo responde tu AI Agent. Puedes probar esto más tarde si prefieres.',
    page: '/chats',
    targetSelector: '[data-testid="chat-test-section"]',
    position: 'left',
    action: 'highlight',
    optional: true
  },
  {
    id: 'onboarding-complete',
    title: '¡Felicitaciones! 🎊',
    description: 'Has completado la configuración inicial. Tu tienda está lista para recibir pedidos automáticamente con IA.',
    page: '/chats',
    position: 'center',
    action: 'wait'
  }
];

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // If user profile doesn't exist, assume onboarding not completed
          if (error.code === 'PGRST116') {
            setHasCompletedOnboarding(false);
            return;
          }
          console.error('Error checking onboarding status:', error);
          return;
        }

        // If profile exists with business_name, consider onboarding completed
        const completed = !!data?.business_name;
        setHasCompletedOnboarding(completed);
        
        // Don't auto-start onboarding, let user click the button
      } catch (error) {
        console.error('Error in checkOnboardingStatus:', error);
        setHasCompletedOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const startOnboarding = () => {
    setIsOnboarding(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    setIsOnboarding(false);
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    setIsOnboarding(false);
    setHasCompletedOnboarding(true);

    if (user) {
      try {
        // Mark onboarding as complete by ensuring profile exists
        await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            business_name: 'Mi Negocio', // Default business name
            updated_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Error marking onboarding as completed:', error);
      }
    }
  };

  const isStepActive = (stepId: string) => {
    const step = ONBOARDING_STEPS[currentStep];
    return isOnboarding && step?.id === stepId;
  };

  const triggerStepCompletion = (stepId: string) => {
    const step = ONBOARDING_STEPS[currentStep];
    if (isOnboarding && step?.id === stepId) {
      // Don't auto-advance, let user manually continue
      // The step completion is just for tracking
      console.log(`Step ${stepId} completed`);
    }
  };

  const currentStepData = isOnboarding ? ONBOARDING_STEPS[currentStep] : null;

  const value: OnboardingContextType = {
    isOnboarding,
    currentStep,
    currentStepData,
    totalSteps: ONBOARDING_STEPS.length,
    startOnboarding,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    isStepActive,
    triggerStepCompletion,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
