import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FlowStep } from '@/hooks/useFlowSteps';
import { FileText, Upload, X, GripVertical } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileStepEditorProps {
  step: FlowStep;
  onUpdate: (updates: Partial<FlowStep>) => void;
}

export const FileStepEditor = ({ step, onUpdate }: FileStepEditorProps) => {
  const [caption, setCaption] = useState(step.content || '');
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Parse files from media_url (could be single URL or JSON array)
  const getFiles = () => {
    if (!step.media_url) return [];
    try {
      const parsed = JSON.parse(step.media_url);
      return Array.isArray(parsed) ? parsed : [step.media_url];
    } catch {
      return [step.media_url];
    }
  };

  const files = getFiles();

  const getFileName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return decodeURIComponent(pathParts[pathParts.length - 1]);
    } catch {
      return 'Archivo';
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of selectedFiles) {
        if (file.size > 100 * 1024 * 1024) {
          toast.error(`${file.name} es demasiado grande. Máximo 100MB`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `flow-files/${Math.random().toString(36).substring(2)}.${fileExt}`;

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
        const newFiles = [...files, ...uploadedUrls];
        onUpdate({ media_url: JSON.stringify(newFiles) });
        toast.success(`${uploadedUrls.length} archivo(s) subido(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir los archivos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onUpdate({ 
      media_url: newFiles.length > 0 ? JSON.stringify(newFiles) : '' 
    });
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    const newFiles = [...files];
    const [moved] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, moved);
    onUpdate({ media_url: JSON.stringify(newFiles) });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveFile(draggedIndex, index);
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
        <FileText className="h-4 w-4 text-primary" />
        <Label>Archivos</Label>
      </div>
      
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
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
          {uploading ? 'Subiendo...' : 'Subir Archivos'}
        </Button>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Arrastra para reordenar • Primer archivo se envía primero
          </Label>
          <div className="space-y-2">
            {files.map((url, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative group rounded-lg overflow-hidden border cursor-move transition-all p-3 bg-muted/30",
                  draggedIndex === index && "opacity-50 scale-95"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-2 py-1 bg-primary text-primary-foreground rounded-full text-[10px] font-semibold shrink-0">
                    <GripVertical className="h-3 w-3" />
                    {index + 1}
                  </div>
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{getFileName(url)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="file-caption" className="text-sm">Texto (opcional)</Label>
        <Textarea
          id="file-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleCaptionBlur}
          placeholder="Texto que acompaña a los archivos..."
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  );
};