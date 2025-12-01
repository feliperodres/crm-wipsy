import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Brain, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface AIFunctionStepEditorProps {
  step: {
    id: string;
    ai_prompt: string | null;
    ai_config: any;
  };
  onUpdate: (updates: any) => void;
}

const EXAMPLE_PROMPTS: string[] = [
  'Ofrece un descuento del 15% si el cliente ha mostrado interés en comprar',
  'Pregunta al cliente qué productos le interesan más y ofrece recomendaciones',
  'Si el cliente preguntó por precios, ofrécele un combo personalizado con 2-3 imágenes de productos',
  'Responde de manera empática si el cliente tiene una objeción y ofrece soluciones',
  'Envía un video tutorial mostrando cómo usar el producto más un mensaje de texto explicativo',
];

export function AIFunctionStepEditor({ step, onUpdate }: AIFunctionStepEditorProps) {
  const [prompt, setPrompt] = useState<string>(step.ai_prompt || '');

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    onUpdate({ ai_prompt: value });
  };

  const useExamplePrompt = (example: string) => {
    setPrompt(example);
    onUpdate({ ai_prompt: example });
    toast.success('Ejemplo aplicado');
  };

  return (
    <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <Brain className="w-5 h-5" />
          <span className="font-semibold">Función IA: Analizar y Responder</span>
        </div>

        <div className="space-y-2">
          <Label>Prompt Personalizado</Label>
          <Textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="Describe qué quieres que haga la IA... Puede enviar texto, imágenes, videos o múltiples mensajes según necesite."
            className="min-h-[120px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            La IA puede enviar múltiples mensajes con texto, imágenes o videos según lo necesite.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Ejemplos de Prompts</Label>
          <div className="space-y-2">
            {EXAMPLE_PROMPTS.map((example, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                onClick={() => useExamplePrompt(example)}
              >
                <Copy className="w-3 h-3 mr-2 flex-shrink-0" />
                <span className="text-xs">{example}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
