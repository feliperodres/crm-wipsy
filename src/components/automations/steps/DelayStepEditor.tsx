import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FlowStep } from '@/hooks/useFlowSteps';
import { Clock } from 'lucide-react';
import { useState } from 'react';

interface DelayStepEditorProps {
  step: FlowStep;
  onUpdate: (updates: Partial<FlowStep>) => void;
}

export const DelayStepEditor = ({ step, onUpdate }: DelayStepEditorProps) => {
  const [seconds, setSeconds] = useState(step.delay_seconds || 2);

  const handleChange = (value: number) => {
    setSeconds(value);
    onUpdate({ delay_seconds: value });
  };

  const presets = [1, 2, 5, 10];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <Label>Pausa</Label>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="delay-seconds" className="text-sm">Segundos de espera</Label>
        <Input
          id="delay-seconds"
          type="number"
          min="1"
          max="60"
          value={seconds}
          onChange={(e) => handleChange(parseInt(e.target.value) || 1)}
        />
      </div>

      <div className="flex gap-2">
        {presets.map((preset) => (
          <Button
            key={preset}
            variant={seconds === preset ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleChange(preset)}
          >
            {preset}s
          </Button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        El sistema esperará {seconds} segundo{seconds !== 1 ? 's' : ''} antes de enviar el siguiente mensaje
      </p>
    </div>
  );
};
