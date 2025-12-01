import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FlowStep } from '@/hooks/useFlowSteps';
import { Image as ImageIcon, Upload, X, GripVertical } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageStepEditorProps {
  step: FlowStep;
  onUpdate: (updates: Partial<FlowStep>) => void;
}

export const ImageStepEditor = ({ step, onUpdate }: ImageStepEditorProps) => {
  const [caption, setCaption] = useState(step.content || '');
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Parse images from media_url (could be single URL or JSON array)
  const getImages = () => {
    if (!step.media_url) return [];
    try {
      const parsed = JSON.parse(step.media_url);
      return Array.isArray(parsed) ? parsed : [step.media_url];
    } catch {
      return [step.media_url];
    }
  };

  const images = getImages();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} no es una imagen válida`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} es demasiado grande. Máximo 10MB`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `flow-images/${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (error) {
          console.error('Upload error:', error);
          toast.error(`Error subiendo ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(data.path);

        uploadedUrls.push(urlData.publicUrl);
      }

      if (uploadedUrls.length > 0) {
        const newImages = [...images, ...uploadedUrls];
        onUpdate({ media_url: JSON.stringify(newImages) });
        toast.success(`${uploadedUrls.length} imagen(es) subida(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir las imágenes');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onUpdate({ 
      media_url: newImages.length > 0 ? JSON.stringify(newImages) : '' 
    });
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [moved] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, moved);
    onUpdate({ media_url: JSON.stringify(newImages) });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveImage(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleCaptionBlur = () => {
    if (caption !== step.content) {
      onUpdate({ content: caption });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-primary" />
        <Label>Imágenes</Label>
      </div>
      
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
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
          {uploading ? 'Subiendo...' : 'Subir Imágenes'}
        </Button>
      </div>

      {images.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Arrastra para reordenar • Primera imagen se envía primero
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {images.map((url, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative group rounded-lg overflow-hidden border cursor-move transition-all",
                  draggedIndex === index && "opacity-50 scale-95"
                )}
              >
                <div className="absolute top-1 left-1 z-10 flex items-center gap-1 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-semibold">
                  <GripVertical className="h-3 w-3" />
                  {index + 1}
                </div>
                <img src={url} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="image-caption" className="text-sm">Texto (opcional)</Label>
        <Textarea
          id="image-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleCaptionBlur}
          placeholder="Texto que acompaña a las imágenes..."
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  );
};
