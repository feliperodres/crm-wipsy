import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  CheckCircle, 
  Package, 
  MessageCircle, 
  Bot, 
  MessageSquare,
  Sparkles,
  Clock
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const OnboardingOverlay: React.FC = () => {
  const {
    isOnboarding,
    currentStep,
    currentStepData,
    totalSteps,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
  } = useOnboarding();

  const navigate = useNavigate();
  const location = useLocation();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0 });

  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL LOGIC

  // Update target element and position when step changes
  useEffect(() => {
    if (!isOnboarding || !currentStepData?.targetSelector) {
      setTargetElement(null);
      return;
    }

    const findTarget = () => {
      const element = document.querySelector(currentStepData.targetSelector!) as HTMLElement;
      if (element) {
        setTargetElement(element);
        
        // Calculate position for the overlay
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        let top = rect.top + scrollTop;
        let left = rect.left + scrollLeft;
        
        // Adjust position based on step configuration
        switch (currentStepData.position) {
          case 'top':
            top -= 20;
            left += rect.width / 2;
            break;
          case 'bottom':
            top += rect.height + 20;
            left += rect.width / 2;
            break;
          case 'left':
            top += rect.height / 2;
            left -= 20;
            break;
          case 'right':
            top += rect.height / 2;
            left += rect.width + 20;
            break;
          default:
            // Center position
            top = window.innerHeight / 2 + scrollTop;
            left = window.innerWidth / 2 + scrollLeft;
        }
        
        setOverlayPosition({ top, left });
      }
    };

    // Try to find the element immediately
    findTarget();
    
    // If not found, try again after a short delay
    const timer = setTimeout(findTarget, 500);
    
    return () => clearTimeout(timer);
  }, [currentStepData, isOnboarding]);

  // Handle navigation when step requires it
  useEffect(() => {
    if (!isOnboarding || !currentStepData) return;

    if (currentStepData.action === 'navigate' && currentStepData.nextPage) {
      const currentPath = location.pathname;
      if (currentPath !== currentStepData.nextPage) {
        navigate(currentStepData.nextPage);
      }
    }
  }, [currentStepData, isOnboarding, navigate, location.pathname]);

  // Make sure the target element has appropriate z-index
  useEffect(() => {
    if (targetElement && isOnboarding) {
      const originalZIndex = targetElement.style.zIndex;
      const originalPosition = targetElement.style.position;
      
      // Ensure the element is positioned but not too high z-index
      targetElement.style.position = originalPosition || 'relative';
      targetElement.style.zIndex = '50'; // Above backdrop and highlight, but below dialogs
      
      return () => {
        targetElement.style.zIndex = originalZIndex;
        targetElement.style.position = originalPosition;
      };
    }
  }, [targetElement, isOnboarding]);

  // Icons for each step
  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'welcome':
      case 'onboarding-complete':
        return <Sparkles className="h-6 w-6" />;
      case 'products-intro':
      case 'create-product':
      case 'products-completed':
        return <Package className="h-6 w-6" />;
      case 'whatsapp-intro':
      case 'whatsapp-connect':
        return <MessageCircle className="h-6 w-6" />;
      case 'ai-agent-intro':
      case 'ai-agent-config':
        return <Bot className="h-6 w-6" />;
      case 'test-agent-intro':
      case 'test-chat':
        return <MessageSquare className="h-6 w-6" />;
      default:
        return <CheckCircle className="h-6 w-6" />;
    }
  };

  // Only show onboarding if we're on the correct page for the current step
  const shouldShowOnboarding = () => {
    if (!isOnboarding || !currentStepData) return false;
    
    // For center-positioned steps (intro steps), show on any page
    if (currentStepData.position === 'center') {
      return true;
    }
    
    // For other steps, show only on the correct page
    return location.pathname === currentStepData.page;
  };

  const handleNext = () => {
    if (currentStepData?.action === 'navigate' && currentStepData.nextPage) {
      navigate(currentStepData.nextPage);
      setTimeout(nextStep, 500); // Small delay to let page load
    } else {
      nextStep();
    }
  };

  const handleSkip = () => {
    skipOnboarding();
  };

  const progress = ((currentStep + 1) / totalSteps) * 100;

  // EARLY RETURN AFTER ALL HOOKS
  if (!shouldShowOnboarding()) {
    return null;
  }

  // Create subtle backdrop that stays behind dialogs
  const backdrop = (
    <div 
      className="fixed inset-0 bg-black/10 transition-all duration-300 pointer-events-none"
      style={{ zIndex: 40 }} // Much lower z-index, behind dialogs
    />
  );

  // Simple highlight overlay that doesn't block interaction
  const highlightOverlay = targetElement && (
    <div
      className="fixed border-4 border-primary rounded-lg shadow-lg shadow-primary/50 transition-all duration-300 pointer-events-none animate-pulse"
      style={{
        top: targetElement.getBoundingClientRect().top + window.pageYOffset - 4,
        left: targetElement.getBoundingClientRect().left + window.pageXOffset - 4,
        width: targetElement.offsetWidth + 8,
        height: targetElement.offsetHeight + 8,
        zIndex: 45, // Lower z-index, behind dialogs but above backdrop
        background: 'rgba(59, 130, 246, 0.1)',
      }}
    />
  );



  // Calculate safe position for the onboarding card
  const getSafeCardPosition = () => {
    const cardWidth = 400;
    const cardHeight = 300;
    const padding = 20;
    
    // For center position, always center on screen
    if (currentStepData.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    // For other positions, use a fixed safe position
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top: number | string = padding;
    let left: number | string = padding;
    let transform = 'none';

    switch (currentStepData.position) {
      case 'left':
        // Position on the left side of screen
        left = padding;
        top = Math.max(padding, Math.min(viewportHeight / 2 - cardHeight / 2, viewportHeight - cardHeight - padding));
        break;
      case 'right':
        // Position on the right side of screen  
        left = Math.max(padding, viewportWidth - cardWidth - padding);
        top = Math.max(padding, Math.min(viewportHeight / 2 - cardHeight / 2, viewportHeight - cardHeight - padding));
        break;
      case 'top':
        // Position at top center
        left = Math.max(padding, Math.min(viewportWidth / 2 - cardWidth / 2, viewportWidth - cardWidth - padding));
        top = padding;
        break;
      case 'bottom':
        // Position at bottom center
        left = Math.max(padding, Math.min(viewportWidth / 2 - cardWidth / 2, viewportWidth - cardWidth - padding));
        top = Math.max(padding, viewportHeight - cardHeight - padding);
        break;
      default:
        // Default to top-left with padding
        left = padding;
        top = padding;
    }
    
    return { top, left, transform };
  };

  const cardPosition = getSafeCardPosition();

  // Main onboarding card
  const onboardingCard = (
    <div
      className="fixed transition-all duration-300"
      style={{
        top: cardPosition.top,
        left: cardPosition.left,
        transform: cardPosition.transform,
        zIndex: 10001, // Higher than dialog z-index
        maxWidth: '400px',
        width: 'min(400px, 90vw)',
      }}
    >
      <Card className="shadow-2xl border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                {getStepIcon(currentStepData.id)}
              </div>
              <div>
                <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
                <Badge variant="secondary" className="mt-1">
                  Paso {currentStep + 1} de {totalSteps}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="mt-3" />
        </CardHeader>
        
        <CardContent className="pt-0">
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {currentStepData.description}
          </p>
          
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <div className="flex items-center gap-2">
              {currentStepData.optional ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Probar más tarde
                  </Button>
                  
                  <Button
                    onClick={handleNext}
                    className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
                  >
                    {currentStep === totalSteps - 1 ? 'Finalizar' : 'Continuar'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Saltar
                  </Button>
                  
                  <Button
                    onClick={handleNext}
                    className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
                  >
                    {currentStep === totalSteps - 1 ? 'Finalizar' : 'Siguiente'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      {backdrop}
      {highlightOverlay}
      {onboardingCard}
    </>
  );
};

export default OnboardingOverlay;
