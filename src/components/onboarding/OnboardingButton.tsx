import React from 'react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Play, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OnboardingButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  text?: string;
}

export const OnboardingButton: React.FC<OnboardingButtonProps> = ({
  variant = 'outline',
  size = 'sm',
  showIcon = true,
  text = 'Ver Tutorial'
}) => {
  const { startOnboarding } = useOnboarding();
  const { toast } = useToast();

  const handleClick = () => {
    startOnboarding();
    toast({
      title: "Tutorial iniciado",
      description: "Te guiaremos paso a paso por la plataforma",
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className="flex items-center gap-2"
    >
      {showIcon && <Play className="h-4 w-4" />}
      {text}
    </Button>
  );
};

export const OnboardingHelpButton: React.FC = () => {
  const { startOnboarding } = useOnboarding();
  const { toast } = useToast();

  const handleClick = () => {
    startOnboarding();
    toast({
      title: "¡Comenzamos el tutorial! 🚀",
      description: "Te mostraremos cómo configurar tu tienda paso a paso",
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="text-muted-foreground hover:text-primary"
      title="Ver tutorial de configuración"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  );
};
