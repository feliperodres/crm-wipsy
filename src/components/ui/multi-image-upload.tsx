import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, GripVertical, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MultiImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  coverImageIndex: number;
  onCoverImageChange: (index: number) => void;
  maxImages?: number;
  className?: string;
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  images,
  onImagesChange,
  coverImageIndex,
  onCoverImageChange,
  maxImages = 8,
  className
}) => {
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = maxImages - images.length;
    const filesToUpload = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast.warning(`Solo puedes subir ${remainingSlots} imágenes más. Límite máximo: ${maxImages}`);
    }

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        // Validate file type
        const isVideoFile = file.type.startsWith('video/');
        const isImageFile = file.type.startsWith('image/');
        
        if (!isImageFile && !isVideoFile) {
          toast.error(`${file.name} no es un archivo válido`);
          continue;
        }

        // Validate file size (max 10MB for images, 50MB for videos)
        const maxSize = isVideoFile ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        const maxSizeLabel = isVideoFile ? '50MB' : '10MB';
        
        if (file.size > maxSize) {
          toast.error(`${file.name} es demasiado grande. Máximo ${maxSizeLabel}`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

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
        onImagesChange(newImages);
        toast.success(`${uploadedUrls.length} imagen(es) subida(s) exitosamente`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error inesperado al subir las imágenes');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    
    // Adjust cover image index if needed
    if (coverImageIndex === index) {
      onCoverImageChange(0);
    } else if (coverImageIndex > index) {
      onCoverImageChange(coverImageIndex - 1);
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [moved] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, moved);
    onImagesChange(newImages);

    // Adjust cover image index
    if (coverImageIndex === fromIndex) {
      onCoverImageChange(toIndex);
    } else if (coverImageIndex > fromIndex && coverImageIndex <= toIndex) {
      onCoverImageChange(coverImageIndex - 1);
    } else if (coverImageIndex < fromIndex && coverImageIndex >= toIndex) {
      onCoverImageChange(coverImageIndex + 1);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveImage(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Media del Producto</label>
          <p className="text-xs text-muted-foreground">
            Máximo {maxImages} archivos (imágenes/videos). Arrastra para reordenar por importancia.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= maxImages}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Subiendo...' : 'Agregar Media'}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {images.length === 0 ? (
        <Card className="border-2 border-dashed border-muted-foreground/25 p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Camera className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              No hay media del producto
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir Primera Imagen/Video
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <Card
              key={index}
              className={cn(
                "relative group cursor-move overflow-hidden",
                coverImageIndex === index && "ring-2 ring-primary"
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="aspect-square relative">
                {isVideo(imageUrl) ? (
                  <video
                    src={imageUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    controls
                  />
                ) : (
                  <img
                    src={imageUrl}
                    alt={`Producto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Cover badge */}
                {coverImageIndex === index && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Portada
                  </div>
                )}
                
                {/* Drag handle */}
                <div className="absolute top-2 right-2 bg-background/80 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute bottom-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Set as cover button */}
                {coverImageIndex !== index && (
                  <button
                    type="button"
                    onClick={() => onCoverImageChange(index)}
                    className="absolute bottom-2 left-2 bg-background/80 text-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Hacer Portada
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {images.length} de {maxImages} archivos. 
          {coverImageIndex < images.length && ` Portada: Archivo ${coverImageIndex + 1}`}
        </p>
      )}
    </div>
  );
};