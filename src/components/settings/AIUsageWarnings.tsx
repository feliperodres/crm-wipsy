import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, AlertCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AIUsageWarningsProps {
  usagePercentage: number;
  messagesUsed: number;
  messagesLimit: number;
  isBlocked: boolean;
}

export function AIUsageWarnings({ 
  usagePercentage, 
  messagesUsed, 
  messagesLimit,
  isBlocked 
}: AIUsageWarningsProps) {
  const navigate = useNavigate();

  if (isBlocked || usagePercentage >= 100) {
    return (
      <Alert variant="destructive" className="border-2">
        <XCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">
          Límite de Mensajes IA Alcanzado
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p>
            Has utilizado <strong>{messagesUsed} de {messagesLimit}</strong> mensajes IA incluidos en tu plan este mes.
          </p>
          <p className="text-sm">
            Tu agente IA está desactivado hasta que actualices tu plan o el próximo mes inicie.
          </p>
          <Button 
            onClick={() => navigate('/settings?tab=plan')}
            variant="destructive"
            className="mt-2"
          >
            Actualizar Plan Ahora
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (usagePercentage >= 90) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Te quedan solo {messagesLimit - messagesUsed} mensajes IA este mes</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <Progress value={usagePercentage} className="h-2" />
          <p className="text-sm">
            Estás usando {messagesUsed} de {messagesLimit} mensajes ({usagePercentage}%). 
            Actualiza tu plan para continuar usando el agente IA sin interrupciones.
          </p>
          <Button 
            onClick={() => navigate('/settings?tab=plan')}
            size="sm"
            variant="outline"
            className="mt-2"
          >
            Ver Planes
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (usagePercentage >= 80) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Te quedan {messagesLimit - messagesUsed} mensajes IA este mes</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <Progress value={usagePercentage} className="h-2" />
          <p className="text-sm">
            Estás usando {messagesUsed} de {messagesLimit} mensajes ({usagePercentage}%).
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}