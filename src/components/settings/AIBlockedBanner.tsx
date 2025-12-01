import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUsageLimits } from "@/hooks/useUsageLimits";

export function AIBlockedBanner() {
  const navigate = useNavigate();
  const { usageLimits, isBlocked } = useUsageLimits();

  if (!isBlocked()) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6 border-2">
      <XCircle className="h-5 w-5" />
      <AlertTitle className="text-lg font-bold">
        ⚠️ Tu Agente IA NO está respondiendo mensajes
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="font-semibold">
          Has alcanzado el límite de {usageLimits?.max_ai_messages} mensajes IA de tu plan {usageLimits?.plan_name}.
        </p>
        <p className="text-sm">
          Tu agente IA está desactivado y NO responderá a los mensajes de tus clientes hasta que actualices tu plan o inicie el próximo mes.
        </p>
        <div className="flex gap-3 mt-3">
          <Button 
            onClick={() => navigate('/settings?tab=plan')}
            variant="destructive"
            size="lg"
            className="font-semibold"
          >
            Actualizar Plan Ahora
          </Button>
          <Button 
            onClick={() => navigate('/settings')}
            variant="outline"
            size="lg"
          >
            Ver Uso Actual
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}