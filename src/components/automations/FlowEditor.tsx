import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, MessageSquare, Image, Video, Clock, Trash2, GripVertical, Smartphone, Zap, Volume2, Sparkles, FileText } from 'lucide-react';
import { useFlowSteps } from '@/hooks/useFlowSteps';
import { useFlows } from '@/hooks/useFlows';
import { useState } from 'react';
import { FlowPhonePreview } from './FlowPhonePreview';
import { TextStepEditor } from './steps/TextStepEditor';
import { ImageStepEditor } from './steps/ImageStepEditor';
import { VideoStepEditor } from './steps/VideoStepEditor';
import { DelayStepEditor } from './steps/DelayStepEditor';
import { AudioStepEditor } from './steps/AudioStepEditor';
import { AIFunctionStepEditor } from './steps/AIFunctionStepEditor';
import { FileStepEditor } from './steps/FileStepEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';

interface FlowEditorProps {
  flow: {
    id: string;
    name: string;
    is_active: boolean;
    flow_type: string;
    trigger_conditions?: any;
  };
  onBack: () => void;
}

export const FlowEditor = ({ flow, onBack }: FlowEditorProps) => {
  const { steps, isLoading, createStep, updateStep, deleteStep } = useFlowSteps(flow.id);
  const { updateFlow, toggleActive } = useFlows();
  const [flowName, setFlowName] = useState(flow.name);
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null);
  // Helper functions para convertir entre unidades
  const convertToHours = (value: number, unit: string): number => {
    switch (unit) {
      case 'seconds': return value / 3600;
      case 'minutes': return value / 60;
      case 'hours': return value;
      case 'days': return value * 24;
      default: return value;
    }
  };

  const convertFromHours = (hours: number, unit: string): number => {
    switch (unit) {
      case 'seconds': return Math.round(hours * 3600);
      case 'minutes': return Math.round(hours * 60);
      case 'hours': return hours;
      case 'days': return hours / 24;
      default: return hours;
    }
  };

  const getUnitLabel = (value: number, unit: string): string => {
    const labels: Record<string, string> = {
      seconds: value === 1 ? 'segundo' : 'segundos',
      minutes: value === 1 ? 'minuto' : 'minutos',
      hours: value === 1 ? 'hora' : 'horas',
      days: value === 1 ? 'día' : 'días',
    };
    return labels[unit] || unit;
  };

  const [triggers, setTriggers] = useState<{
    first_message: boolean;
    inactivity: boolean;
    inactivityValue: number;
    inactivityUnit: string;
    inactivityRepeat: boolean;
  }>(() => {
    const inactivityHours = flow.trigger_conditions?.on_inactivity?.hours || 24;
    
    // Por defecto usar horas si son múltiplos de 24, días si no
    const inactivityUnit = inactivityHours >= 24 && inactivityHours % 24 === 0 ? 'days' : 'hours';
    
    return {
      first_message: flow.trigger_conditions?.on_first_message || false,
      inactivity: flow.trigger_conditions?.on_inactivity?.enabled || false,
      inactivityValue: convertFromHours(inactivityHours, inactivityUnit),
      inactivityUnit,
      inactivityRepeat: flow.trigger_conditions?.on_inactivity?.repeat ?? true, // Por defecto se repite
    };
  });

  const handleNameChange = (newName: string) => {
    setFlowName(newName);
    updateFlow(flow.id, { name: newName });
  };

  const handleTriggerToggle = (triggerType: 'first_message' | 'inactivity', checked: boolean) => {
    const newTriggers = { ...triggers, [triggerType]: checked };
    setTriggers(newTriggers);
    
    const newConditions = {
      on_first_message: newTriggers.first_message,
      on_inactivity: newTriggers.inactivity ? {
        enabled: true,
        hours: convertToHours(newTriggers.inactivityValue, newTriggers.inactivityUnit),
        repeat: newTriggers.inactivityRepeat
      } : undefined,
    };
    
    updateFlow(flow.id, { trigger_conditions: newConditions });
  };

  const handleInactivityChange = (value: number, unit: string) => {
    const hours = convertToHours(value, unit);
    const newTriggers = { ...triggers, inactivityValue: value, inactivityUnit: unit };
    setTriggers(newTriggers);
    
    if (triggers.inactivity) {
      updateFlow(flow.id, { 
        trigger_conditions: { 
          on_first_message: triggers.first_message,
          on_inactivity: { enabled: true, hours, repeat: triggers.inactivityRepeat },
        } 
      });
    }
  };

  const handleInactivityRepeatChange = (repeat: boolean) => {
    const newTriggers = { ...triggers, inactivityRepeat: repeat };
    setTriggers(newTriggers);
    
    if (triggers.inactivity) {
      updateFlow(flow.id, { 
        trigger_conditions: { 
          on_first_message: triggers.first_message,
          on_inactivity: { 
            enabled: true, 
            hours: convertToHours(triggers.inactivityValue, triggers.inactivityUnit),
            repeat 
          },
        } 
      });
    }
  };

  const getSelectedTriggersText = () => {
    const selected = [];
    if (triggers.first_message) selected.push('Cliente nuevo');
    if (triggers.inactivity) {
      selected.push(`Inactivo ${triggers.inactivityValue} ${getUnitLabel(triggers.inactivityValue, triggers.inactivityUnit)}`);
    }
    return selected.length > 0 ? selected.join(', ') : 'Seleccionar disparadores';
  };

  const handleAddStep = (type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'delay' | 'ai_function') => {
    const nextOrder = steps ? steps.length : 0;
    createStep({
      flow_id: flow.id,
      step_order: nextOrder,
      step_type: type,
      content: type === 'text' ? 'Escribe tu mensaje aquí...' : null,
      media_url: null,
      delay_seconds: type === 'delay' ? 2 : 0,
      ai_prompt: type === 'ai_function' ? '' : null,
      ai_config: type === 'ai_function' ? { function_type: 'analyze_and_respond' } : null,
    });
  };

  const handleDeleteStep = (stepId: string) => {
    deleteStep(stepId);
    setDeleteStepId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <Badge variant={flow.is_active ? 'default' : 'secondary'} className="text-sm">
              {flow.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
            <div className="flex items-center gap-2">
              <Label htmlFor="active-toggle" className="text-sm text-muted-foreground">Estado:</Label>
              <Switch
                id="active-toggle"
                checked={flow.is_active}
                onCheckedChange={(checked) => toggleActive(flow.id, checked)}
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="flow-name" className="text-sm font-medium">
            Nombre del Flujo
          </Label>
          <Input
            id="flow-name"
            value={flowName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="text-lg font-semibold max-w-md"
            placeholder="Ej: Bienvenida nuevos clientes"
          />
          <p className="text-muted-foreground text-xs">
            Dale un nombre descriptivo para identificar fácilmente este flujo
          </p>
        </div>
      </div>

      {/* Trigger Configuration */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Disparadores del Flujo</h3>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-background hover:bg-accent"
              >
                <span className="truncate">{getSelectedTriggersText()}</span>
                <ChevronDown className="h-4 w-4 shrink-0 ml-2 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-4 bg-background z-50" align="start">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="first_message"
                      checked={triggers.first_message}
                      onCheckedChange={(checked) => 
                        handleTriggerToggle('first_message', checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor="first_message" 
                        className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Cuando un cliente nuevo escribe por primera vez
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        El flujo se activará automáticamente cuando un nuevo cliente envíe su primer mensaje
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="inactivity"
                      checked={triggers.inactivity}
                      onCheckedChange={(checked) => 
                        handleTriggerToggle('inactivity', checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor="inactivity" 
                        className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Cuando un cliente lleva tiempo sin escribir
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Reactivar conversaciones con clientes que no han escrito recientemente
                      </p>
                      
                      {triggers.inactivity && (
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="inactivity-value" className="text-sm whitespace-nowrap">
                              Tiempo:
                            </Label>
                            <Input
                              id="inactivity-value"
                              type="number"
                              min="1"
                              value={triggers.inactivityValue}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 1;
                                handleInactivityChange(value, triggers.inactivityUnit);
                              }}
                              className="w-20 bg-background"
                            />
                            <Select 
                              value={triggers.inactivityUnit}
                              onValueChange={(unit) => handleInactivityChange(triggers.inactivityValue, unit)}
                            >
                              <SelectTrigger className="w-[130px] bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background z-50">
                                <SelectItem value="seconds">Segundos</SelectItem>
                                <SelectItem value="minutes">Minutos</SelectItem>
                                <SelectItem value="hours">Horas</SelectItem>
                                <SelectItem value="days">Días</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center space-x-2 pt-2 border-t">
                            <Switch
                              id="inactivity-repeat"
                              checked={triggers.inactivityRepeat}
                              onCheckedChange={handleInactivityRepeatChange}
                            />
                            <Label htmlFor="inactivity-repeat" className="text-sm cursor-pointer">
                              Repetir cada vez que se cumpla el tiempo
                            </Label>
                          </div>
                          <div className="text-xs text-muted-foreground pl-0 space-y-1 bg-muted/30 p-3 rounded-md">
                            {triggers.inactivityRepeat ? (
                              <>
                                <p className="font-medium text-foreground">✓ Modo repetible activado</p>
                                <p>El flujo se enviará cada vez que el cliente esté inactivo por el tiempo configurado.</p>
                                <p className="pt-1"><strong>Cooldown de 24h:</strong> Para evitar spam, después de enviar el flujo, esperará al menos 24 horas antes de poder enviarlo otra vez al mismo cliente, aunque vuelva a cumplirse la condición de inactividad.</p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium text-foreground">✗ Envío único</p>
                                <p>Este flujo se enviará solo una vez por cliente. Después de enviarse la primera vez, no volverá a enviarse aunque el cliente vuelva a estar inactivo.</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Editor */}
        <div className="space-y-4">
          <Card className="border-2 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Pasos del Flujo</CardTitle>
                  <CardDescription className="mt-1">
                    Arrastra para reordenar, edita cada paso según necesites
                  </CardDescription>
                </div>
                {steps && steps.length > 0 && (
                  <Badge variant="secondary">{steps.length} {steps.length === 1 ? 'paso' : 'pasos'}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-3 opacity-50 animate-spin" />
                  <p>Cargando pasos...</p>
                </div>
              ) : steps && steps.length > 0 ? (
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <Card
                      key={step.id}
                      className="border-2 hover:border-primary/50 transition-all hover:shadow-md"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-2 mt-1 shrink-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">{index + 1}</span>
                            </div>
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {step.step_type === 'text' && (
                              <TextStepEditor
                                step={step}
                                onUpdate={(updates) => updateStep(step.id, updates)}
                              />
                            )}
                            {step.step_type === 'image' && (
                              <ImageStepEditor
                                step={step}
                                onUpdate={(updates) => updateStep(step.id, updates)}
                              />
                            )}
                            {step.step_type === 'video' && (
                              <VideoStepEditor
                                step={step}
                                onUpdate={(updates) => updateStep(step.id, updates)}
                              />
                            )}
                            {step.step_type === 'audio' && (
                              <AudioStepEditor
                                step={step}
                                onUpdate={(updates) => updateStep(step.id, updates)}
                              />
                            )}
                            {step.step_type === 'file' && (
                              <FileStepEditor
                                step={step}
                                onUpdate={(updates) => updateStep(step.id, updates)}
                              />
                            )}
                            {step.step_type === 'delay' && (
                              <DelayStepEditor
                                step={step}
                                onUpdate={(updates) => updateStep(step.id, updates)}
                              />
                            )}
                            {step.step_type === 'ai_function' && (
                              <AIFunctionStepEditor
                                step={step}
                                onUpdate={(updates) => updateStep(step.id, updates)}
                              />
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteStepId(step.id)}
                            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-1">No hay pasos</p>
                  <p className="text-sm">Agrega tu primer paso usando los botones de abajo</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Step Buttons */}
          <Card className="border-2 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Agregar Paso
              </CardTitle>
              <CardDescription>
                Selecciona el tipo de paso que deseas agregar al flujo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleAddStep('text')}
                  className="justify-start h-auto py-4 hover:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Texto</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">Mensaje de texto</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddStep('image')}
                  className="justify-start h-auto py-4 hover:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <Image className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Imagen</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">Imagen con texto</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddStep('video')}
                  className="justify-start h-auto py-4 hover:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Video</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">Video con texto</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddStep('audio')}
                  className="justify-start h-auto py-4 hover:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Audio</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">Mensaje de voz</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddStep('file')}
                  className="justify-start h-auto py-4 hover:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Archivo</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">Documentos y archivos</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddStep('delay')}
                  className="justify-start h-auto py-4 hover:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Pausa</span>
                    </div>
                  <span className="text-xs text-muted-foreground text-left">Esperar antes del siguiente</span>
                </div>
              </Button>
              <div className="pt-3 border-t mt-3">
                <div className="flex items-center gap-2 text-xs font-medium text-purple-600 dark:text-purple-400 uppercase mb-2">
                  <Sparkles className="w-3 h-3" />
                  <span>Funciones IA</span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleAddStep('ai_function')}
                  className="justify-start h-auto py-4 w-full hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950/30 border-purple-200 dark:border-purple-800"
                >
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <span className="font-semibold">Analizar Conversación</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">La IA analiza y responde</span>
                  </div>
                </Button>
              </div>
            </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview with Phone */}
        <div className="lg:sticky lg:top-24 h-fit">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Vista Previa
              </CardTitle>
              <CardDescription>
                Así se verán los mensajes en WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-start p-6 bg-muted/30 rounded-lg">
              <FlowPhonePreview steps={steps || []} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteStepId} onOpenChange={() => setDeleteStepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este paso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El paso será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStepId && handleDeleteStep(deleteStepId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
