import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FlowStep } from '@/hooks/useFlowSteps';
import { Volume2, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AudioStepEditorProps {
  step: FlowStep;
  onUpdate: (updates: Partial<FlowStep>) => void;
}

export const AudioStepEditor = ({ step, onUpdate }: AudioStepEditorProps) => {
  const [caption, setCaption] = useState(step.content || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      if (!file.type.startsWith('audio/')) {
        toast.error('Por favor selecciona un archivo de audio válido');
        return;
      }

      if (file.size > 16 * 1024 * 1024) {
        toast.error('El archivo es demasiado grande. Máximo 16MB');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `flow-audios/${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        toast.error('Error al subir el audio');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      onUpdate({ media_url: urlData.publicUrl });
      toast.success('Audio subido correctamente');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir el audio');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAudio = () => {
    onUpdate({ media_url: '' });
  };

  const handleCaptionBlur = () => {
    if (caption !== step.content) {
      onUpdate({ content: caption });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-primary" />
        <Label>Audio</Label>
      </div>
      
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {!step.media_url ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Subiendo...' : 'Subir Audio'}
          </Button>
        ) : (
          <div className="relative rounded-lg border p-3 bg-muted/50">
            <div className="flex items-center gap-3">
              <Volume2 className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <audio controls className="w-full" src={step.media_url}>
                  Tu navegador no soporta el elemento de audio.
                </audio>
              </div>
              <button
                type="button"
                onClick={removeAudio}
                className="p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="audio-caption" className="text-sm">Texto (opcional)</Label>
        <Textarea
          id="audio-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleCaptionBlur}
          placeholder="Texto que acompaña al audio..."
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  );
};
