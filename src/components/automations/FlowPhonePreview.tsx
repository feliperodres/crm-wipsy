import { FlowStep } from '@/hooks/useFlowSteps';
import { Clock, Check, CheckCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

interface FlowPhonePreviewProps {
  steps: FlowStep[];
}

export const FlowPhonePreview = ({ steps }: FlowPhonePreviewProps) => {
  // Filtrar solo los pasos que no son delays para mostrar en el chat
  const chatSteps = steps.filter(step => step.step_type !== 'delay');

  return (
    <div className="relative mx-auto w-[300px] h-[600px] transform transition-transform hover:scale-[1.02] duration-500">
      {/* Multiple Shadow Layers for Realistic Depth */}
      <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-cyan-500/30 rounded-[3.5rem] blur-2xl opacity-60"></div>
      <div className="absolute -inset-1 bg-gradient-to-b from-blue-500/20 to-purple-500/20 rounded-[3.2rem] blur-xl opacity-50"></div>

      {/* Phone Frame */}
      <div 
        className="relative z-10 w-full h-full bg-gradient-to-br from-[#1a1a1a] via-[#121212] to-[#0a0a0a] rounded-[3rem] overflow-hidden flex flex-col"
        style={{
          boxShadow: `
            0 0 0 8px rgba(0, 0, 0, 0.3),
            0 0 0 9px rgba(40, 40, 40, 0.8),
            0 0 0 10px rgba(0, 0, 0, 0.2),
            0 20px 60px rgba(0, 0, 0, 0.6),
            0 30px 80px rgba(0, 0, 0, 0.4),
            0 0 100px rgba(59, 130, 246, 0.15),
            inset 0 0 0 1px rgba(255, 255, 255, 0.05)
          `
        }}
      >
        {/* Status Bar with Notch */}
        <div className="relative w-full bg-[#075e54] pt-2 pb-1 z-30">
          {/* Notch */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-36 h-7 bg-[#000] rounded-b-3xl border-x border-b border-white/10 shadow-inner flex items-center justify-center">
            <div className="w-16 h-1 bg-gray-700 rounded-full mr-2"></div>
            <div className="w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
          </div>

          {/* Status Bar Content */}
          <div className="relative z-20 px-6 flex justify-between items-center text-white/95 text-[11px] font-semibold">
            <span className="drop-shadow-sm">9:41</span>
            <div className="flex gap-1.5 items-center">
              <div className="w-3.5 h-3.5 bg-white/30 rounded-full border border-white/20"></div>
              <div className="w-3.5 h-3.5 bg-white/30 rounded-full border border-white/20"></div>
              <div className="w-8 h-3.5 bg-white/30 rounded-sm border border-white/20 flex items-center justify-end pr-0.5">
                <div className="w-6 h-2 bg-white/50 rounded-sm"></div>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Header */}
        <div className="bg-[#1f2c34] p-3 flex items-center gap-3 shadow-sm border-b border-white/5 z-10">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold text-sm">
            W
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm">Tu Negocio</h3>
            <p className="text-xs text-white/70">en línea</p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[length:400px]">
          <div className="h-full w-full bg-[#0a1f2b]/70">
            <ScrollArea className="h-full p-4">
              <div className="space-y-3">
                {chatSteps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <Clock className="h-8 w-8 text-white/30" />
                    </div>
                    <p className="text-white/50 text-sm">Agrega pasos para ver la vista previa</p>
                  </div>
                ) : (
                  chatSteps.map((step, index) => {
                    const isLast = index === chatSteps.length - 1;
                    const hasDelay = index < steps.length - 1 && 
                      steps[steps.findIndex(s => s.id === step.id) + 1]?.step_type === 'delay';
                    const delaySeconds = hasDelay 
                      ? steps[steps.findIndex(s => s.id === step.id) + 1]?.delay_seconds || 0
                      : 0;

                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="space-y-2"
                      >
                        {/* Message Bubble */}
                        <div className="flex justify-end">
                          <div className="max-w-[75%] bg-[#056162] text-white rounded-lg rounded-tr-sm p-2.5 shadow-lg">
                            {step.step_type === 'text' && (
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {step.content || 'Mensaje de texto...'}
                              </p>
                            )}
                            {step.step_type === 'image' && (
                              <div>
                                {step.media_url ? (
                                  (() => {
                                    try {
                                      const images = JSON.parse(step.media_url);
                                      return Array.isArray(images) ? (
                                        <div className="space-y-2">
                                          {images.map((url, idx) => (
                                            <img
                                              key={idx}
                                              src={url}
                                              alt={`Preview ${idx + 1}`}
                                              className="rounded-lg max-w-full max-h-[200px] object-cover"
                                            />
                                          ))}
                                        </div>
                                      ) : (
                                        <img
                                          src={step.media_url}
                                          alt="Preview"
                                          className="rounded-lg max-w-full mb-2 max-h-[200px] object-cover"
                                        />
                                      );
                                    } catch {
                                      return (
                                        <img
                                          src={step.media_url}
                                          alt="Preview"
                                          className="rounded-lg max-w-full mb-2 max-h-[200px] object-cover"
                                        />
                                      );
                                    }
                                  })()
                                ) : (
                                  <div className="bg-white/10 rounded-lg p-8 mb-2 text-center">
                                    <p className="text-xs text-white/70">Imagen</p>
                                  </div>
                                )}
                                {step.content && (
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{step.content}</p>
                                )}
                              </div>
                            )}
                            {step.step_type === 'video' && (
                              <div>
                                <div className="bg-white/10 rounded-lg p-8 mb-2 text-center">
                                  <p className="text-xs text-white/70">Video</p>
                                </div>
                                {step.content && (
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{step.content}</p>
                                )}
                              </div>
                            )}
                            {/* Message Time and Status */}
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] text-white/70">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isLast ? (
                                <CheckCheck className="h-3 w-3 text-blue-400" />
                              ) : (
                                <Check className="h-3 w-3 text-white/50" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Delay Indicator */}
                        {hasDelay && delaySeconds > 0 && (
                          <div className="flex items-center gap-2 text-[10px] text-white/70 pl-3">
                            <Clock className="h-3 w-3" />
                            <span>Pausa de {delaySeconds}s</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Input Area (Disabled for Preview) */}
        <div className="bg-[#1f2c34] p-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
              <p className="text-white/50 text-sm">Vista previa</p>
            </div>
          </div>
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-30"></div>
      </div>
    </div>
  );
};

