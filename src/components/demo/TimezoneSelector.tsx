import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Globe } from 'lucide-react';

const TIMEZONES = [
  { value: 'America/Bogota', label: 'Bogotá (COT, GMT-5)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (CST, GMT-6)' },
  { value: 'America/Lima', label: 'Lima (PET, GMT-5)' },
  { value: 'America/Santiago', label: 'Santiago (CLT, GMT-3/4)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART, GMT-3)' },
  { value: 'America/Caracas', label: 'Caracas (VET, GMT-4)' },
  { value: 'America/Guayaquil', label: 'Quito/Guayaquil (ECT, GMT-5)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET, GMT+1/2)' },
  { value: 'America/New_York', label: 'Nueva York (EST, GMT-5/4)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (PST, GMT-8/7)' },
];

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
}

export function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Globe className="h-4 w-4" />
        Tu zona horaria
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12">
          <SelectValue placeholder="Selecciona tu zona horaria" />
        </SelectTrigger>
        <SelectContent>
          {TIMEZONES.map((tz) => (
            <SelectItem key={tz.value} value={tz.value}>
              {tz.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Los horarios se mostrarán en tu zona horaria local
      </p>
    </div>
  );
}
