import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bot, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnboardingAgentProps {
  onNext: (data?: any) => void;
  onBack: () => void;
}

export default function OnboardingAgent({ onNext, onBack }: OnboardingAgentProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [agentName, setAgentName] = useState('Asistente Virtual');
  const [agentRole, setAgentRole] = useState('');
  const [agentObjective, setAgentObjective] = useState('');
  const [agentMode, setAgentMode] = useState<'advise_only' | 'complete_sale'>('advise_only');

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('business_name, agent_name, ai_agent_role, ai_agent_objective, ai_agent_mode')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        if (data.business_name) setBusinessName(data.business_name);
        if (data.agent_name) setAgentName(data.agent_name);
        if (data.ai_agent_role) setAgentRole(data.ai_agent_role);
        if (data.ai_agent_objective) setAgentObjective(data.ai_agent_objective);
        if (data.ai_agent_mode) setAgentMode(data.ai_agent_mode as 'advise_only' | 'complete_sale');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSave = async () => {
    if (!agentRole.trim() || !agentObjective.trim()) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: businessName.trim(),
          agent_name: agentName.trim(),
          ai_agent_role: agentRole.trim(),
          ai_agent_objective: agentObjective.trim(),
          ai_agent_mode: agentMode
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Agente configurado exitosamente');
      onNext({ ai_agent_mode: agentMode });
    } catch (error: any) {
      console.error('Error saving agent config:', error);
      toast.error('Error al guardar la configuración del agente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-fade-in">
      <div className="text-center space-y-3">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
            <div className="relative p-5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl border border-primary/30 shadow-xl">
              <Bot className="h-14 w-14 text-primary" />
            </div>
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white">Personaliza tu Asistente IA</h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Configura cómo tu asistente atenderá a tus clientes
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="business-name" className="text-white text-sm font-medium">Nombre del negocio</Label>
          <Input
            id="business-name"
            placeholder="Tienda de Pruebas"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            disabled={loading}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-name" className="text-white text-sm font-medium">Nombre del asistente</Label>
          <Input
            id="agent-name"
            placeholder="Agente Demo de Wipsy."
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            disabled={loading}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-role" className="text-white text-sm font-medium">
            Rol del agente <span className="text-red-400">*</span>
          </Label>
          <Input
            id="agent-role"
            placeholder="Vender"
            value={agentRole}
            onChange={(e) => setAgentRole(e.target.value)}
            disabled={loading}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12 focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-slate-500 pl-1">
            Ejemplo: "Asistente de ventas especializado en calzado deportivo"
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-objective" className="text-white text-sm font-medium">
            Objetivo del agente <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="agent-objective"
            placeholder="Vender mis productos"
            value={agentObjective}
            onChange={(e) => setAgentObjective(e.target.value)}
            disabled={loading}
            rows={4}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-xs text-slate-500 pl-1">
            Ejemplo: "Ayudar a los clientes a encontrar el calzado perfecto según sus necesidades y completar sus pedidos"
          </p>
        </div>

        <div className="space-y-4 pt-2">
          <Label className="text-white text-sm font-medium">
            Modo de operación <span className="text-red-400">*</span>
          </Label>
          <RadioGroup
            value={agentMode}
            onValueChange={(value) => setAgentMode(value as 'advise_only' | 'complete_sale')}
            disabled={loading}
            className="space-y-3"
          >
            <div 
              onClick={() => !loading && setAgentMode('advise_only')}
              className={`group relative flex items-start space-x-4 p-5 border-2 rounded-xl transition-all cursor-pointer ${
                agentMode === 'advise_only' 
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <RadioGroupItem value="advise_only" id="advise" className="mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="advise" className="cursor-pointer font-semibold text-base text-white">
                  Solo asesorar
                </Label>
                <p className="text-sm text-slate-400 leading-relaxed">
                  El agente recomendará productos y responderá preguntas, pero no procesará pedidos
                </p>
              </div>
            </div>

            <div 
              onClick={() => !loading && setAgentMode('complete_sale')}
              className={`group relative flex items-start space-x-4 p-5 border-2 rounded-xl transition-all cursor-pointer ${
                agentMode === 'complete_sale' 
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <RadioGroupItem value="complete_sale" id="complete" className="mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="complete" className="cursor-pointer font-semibold text-base text-white">
                  Completar ventas
                </Label>
                <p className="text-sm text-slate-400 leading-relaxed">
                  El agente puede capturar información del cliente y procesar pedidos completos
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {agentMode === 'complete_sale' && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl backdrop-blur-sm animate-fade-in">
            <p className="text-sm text-blue-400 flex items-start gap-2">
              <span className="text-base">ℹ️</span>
              <span>En el siguiente paso deberás configurar tarifas de envío para que el agente pueda calcular el costo total de los pedidos</span>
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button 
          variant="ghost" 
          onClick={onBack} 
          disabled={loading} 
          className="px-6 text-slate-400 hover:text-white hover:bg-white/5"
        >
          Volver
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={loading} 
          className="px-8 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Continuar'
          )}
        </Button>
      </div>
    </div>
  );
}
