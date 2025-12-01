import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from './button';
import { toast } from 'sonner';

interface ImageUploadProps {
  onUpload: (file: File) => Promise<string>;
  currentImage?: string;
  onRemove?: () => void;
  placeholder?: string;
  recommendedDimensions?: string;
  maxSizeMB?: number;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUpload,
  currentImage,
  onRemove,
  placeholder = "Subir imagen",
  recommendedDimensions,
  maxSizeMB = 5,
  className = ""
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`El archivo debe ser menor a ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
      toast.success('Imagen subida exitosamente');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
      toast.success('Imagen eliminada');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="space-y-2">
        {currentImage ? (
          <div className="relative inline-block">
            <img
              src={currentImage}
              alt="Imagen actual"
              className="max-w-full h-auto max-h-48 rounded-lg border"
            />
            {onRemove && (
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 w-6 h-6 p-0"
                onClick={handleRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-2">{placeholder}</p>
            {recommendedDimensions && (
              <p className="text-xs text-gray-500 mb-4">
                Dimensiones recomendadas: {recommendedDimensions}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleButtonClick}
            disabled={isUploading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Subiendo...' : currentImage ? 'Cambiar imagen' : 'Seleccionar imagen'}
          </Button>

          {currentImage && onRemove && (
            <Button
              onClick={handleRemove}
              variant="outline"
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Eliminar
            </Button>
          )}
        </div>

        {recommendedDimensions && (
          <p className="text-xs text-gray-500">
            Tamaño máximo: {maxSizeMB}MB | Formatos: JPG, PNG, WebP
          </p>
        )}
      </div>
    </div>
  );
};