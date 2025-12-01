import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FlowStep } from '@/hooks/useFlowSteps';
import { Video, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoStepEditorProps {
  step: FlowStep;
  onUpdate: (updates: Partial<FlowStep>) => void;
}

export const VideoStepEditor = ({ step, onUpdate }: VideoStepEditorProps) => {
  const [caption, setCaption] = useState(step.content || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoUrl = step.media_url || '';

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Por favor selecciona un archivo de video válido');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('El video es demasiado grande. Máximo 50MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `flow-videos/${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        toast.error('Error al subir el video');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      onUpdate({ media_url: urlData.publicUrl });
      toast.success('Video subido exitosamente');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir el video');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeVideo = () => {
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
        <Video className="h-4 w-4 text-primary" />
        <Label>Video</Label>
      </div>
      
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Subiendo...' : 'Subir Video'}
        </Button>
      </div>

      {videoUrl && (
        <div className="relative group rounded-lg overflow-hidden border p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Video cargado</span>
            </div>
            <button
              type="button"
              onClick={removeVideo}
              className="p-1 bg-destructive text-destructive-foreground rounded-full"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="video-caption" className="text-sm">Texto (opcional)</Label>
        <Textarea
          id="video-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleCaptionBlur}
          placeholder="Texto que acompaña al video..."
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  );
};
