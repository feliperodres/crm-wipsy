import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, MessageSquare, Store, Bot, Truck } from 'lucide-react';

export default function OnboardingComplete() {
  const navigate = useNavigate();

  const completedSteps = [
    { icon: MessageSquare, text: 'WhatsApp conectado', color: 'text-green-600' },
    { icon: Store, text: 'Productos configurados', color: 'text-blue-600' },
    { icon: Bot, text: 'AI Agent personalizado', color: 'text-purple-600' },
    { icon: Truck, text: 'Tarifas de envío configuradas', color: 'text-orange-600' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="p-6 bg-green-500/10 rounded-full">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
        </div>
        
        <h2 className="text-3xl font-bold">¡Todo listo! 🎉</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Tu cuenta está completamente configurada y lista para empezar a vender
        </p>
      </div>

      <div className="space-y-3">
        {completedSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg"
            >
              <div className={`p-2 bg-background rounded-lg ${step.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="font-medium">{step.text}</span>
              <CheckCircle2 className="h-5 w-5 text-green-600 ml-auto" />
            </div>
          );
        })}
      </div>

      <div className="space-y-3 pt-4">
        <Button onClick={() => navigate('/dashboard')} size="lg" className="w-full">
          Ir al Dashboard
        </Button>
        
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/chats')}
          >
            Ver Chats
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/products')}
          >
            Productos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/store')}
          >
            Mi Tienda
          </Button>
        </div>
      </div>
    </div>
  );
}
