import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FlowStep } from '@/hooks/useFlowSteps';
import { MessageCircle, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FlowPreviewProps {
  steps: FlowStep[];
}

export const FlowPreview = ({ steps }: FlowPreviewProps) => {
  return (
    <Card className="h-[calc(100vh-200px)] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Vista Previa
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-3">
            {steps.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Agrega pasos para ver la vista previa</p>
              </div>
            ) : (
              steps.map((step, index) => (
                <div key={step.id} className="space-y-2">
                  {/* Message Bubble */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-3 shadow-sm">
                      {step.step_type === 'text' && (
                        <p className="text-sm whitespace-pre-wrap">
                          {step.content || 'Mensaje de texto...'}
                        </p>
                      )}
                      {step.step_type === 'image' && (
                        <div>
                          {step.media_url ? (
                            <img
                              src={step.media_url}
                              alt="Preview"
                              className="rounded-lg max-w-full mb-2"
                            />
                          ) : (
                            <div className="bg-primary-foreground/10 rounded-lg p-8 mb-2 text-center">
                              <p className="text-xs">Imagen</p>
                            </div>
                          )}
                          {step.content && (
                            <p className="text-sm whitespace-pre-wrap">{step.content}</p>
                          )}
                        </div>
                      )}
                      {step.step_type === 'video' && (
                        <div>
                          <div className="bg-primary-foreground/10 rounded-lg p-8 mb-2 text-center">
                            <p className="text-xs">Video</p>
                          </div>
                          {step.content && (
                            <p className="text-sm whitespace-pre-wrap">{step.content}</p>
                          )}
                        </div>
                      )}
                      {step.step_type === 'delay' && (
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="h-3 w-3" />
                          <span>Pausa de {step.delay_seconds}s</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Typing Indicator (if not last step) */}
                  {index < steps.length - 1 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pl-3">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>escribiendo...</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
