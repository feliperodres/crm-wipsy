import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Zap, TrendingUp, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AILimitReachedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUsage: number;
  planLimit: number;
}

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    messages: 1500,
    icon: Zap,
    recommended: true,
    features: [
      '1,500 mensajes IA/mes',
      'Agente IA 24/7',
      'Integración WhatsApp',
      'Catálogo de productos',
      'Análisis básico'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 59,
    messages: 3500,
    icon: TrendingUp,
    recommended: false,
    features: [
      '3,500 mensajes IA/mes',
      'Agente IA 24/7',
      'Integración WhatsApp',
      'Catálogo ilimitado',
      'Análisis avanzado',
      'Soporte prioritario'
    ]
  },
  {
    id: 'business',
    name: 'Business',
    price: 99,
    messages: 7500,
    icon: Building2,
    recommended: false,
    features: [
      '7,500 mensajes IA/mes',
      'Agente IA 24/7',
      'Integraciones avanzadas',
      'Catálogo ilimitado',
      'Análisis profesional',
      'Soporte dedicado',
      'API personalizada'
    ]
  }
];

export function AILimitReachedDialog({ 
  open, 
  onOpenChange, 
  currentUsage, 
  planLimit 
}: AILimitReachedDialogProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/settings?tab=plan');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <span className="text-3xl">⚠️</span>
            Límite de Mensajes IA Alcanzado
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Has utilizado <strong>{currentUsage} de {planLimit}</strong> mensajes incluidos en tu plan FREE este mes.
            <br />
            Para continuar usando el Agente IA, actualiza tu plan:
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card 
                key={plan.id}
                className={`relative p-6 transition-all hover:shadow-lg ${
                  plan.recommended 
                    ? 'border-primary shadow-md ring-2 ring-primary/20' 
                    : 'border-border'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      ⭐ Recomendado
                    </span>
                  </div>
                )}
                
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/mes</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.messages.toLocaleString()} mensajes/mes
                    </p>
                  </div>

                  <ul className="space-y-2 text-left w-full">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          <Button
            onClick={handleUpgrade}
            className="bg-primary hover:bg-primary/90"
          >
            Actualizar Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}