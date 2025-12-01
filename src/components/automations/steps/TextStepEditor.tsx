import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FlowStep } from '@/hooks/useFlowSteps';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface TextStepEditorProps {
  step: FlowStep;
  onUpdate: (updates: Partial<FlowStep>) => void;
}

export const TextStepEditor = ({ step, onUpdate }: TextStepEditorProps) => {
  const [content, setContent] = useState(step.content || '');

  const handleBlur = () => {
    if (content !== step.content) {
      onUpdate({ content });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <Label>Mensaje de Texto</Label>
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        placeholder="Escribe el mensaje que se enviará..."
        rows={3}
        className="resize-none"
      />
      <p className="text-xs text-muted-foreground">
        {content.length} caracteres
      </p>
    </div>
  );
};
