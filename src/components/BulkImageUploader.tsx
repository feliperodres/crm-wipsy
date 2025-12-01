import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface UploadProgress {
  productId: string;
  productName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
}

const BulkImageUploader = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  const handleBulkUpload = async () => {
    if (!user) {
      toast({
        title: "❌ Error",
        description: "Debes estar autenticado para subir imágenes",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress([]);
    setOverallProgress(0);

    try {
      // Get all products with images for this user
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, images')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('images', 'is', null);

      if (error) {
        throw error;
      }

      const productsWithImages = products?.filter(p => 
        p.images && Array.isArray(p.images) && p.images.length > 0
      ) || [];

      if (productsWithImages.length === 0) {
        toast({
          title: "📷 Sin productos",
          description: "No se encontraron productos con imágenes para subir",
        });
        return;
      }

      // Initialize progress tracking
      const progress: UploadProgress[] = productsWithImages.map(product => ({
        productId: product.id,
        productName: product.name,
        status: 'pending',
      }));
      setUploadProgress(progress);

      let successCount = 0;
      let errorCount = 0;

      // Process each product
      for (let i = 0; i < productsWithImages.length; i++) {
        const product = productsWithImages[i];
        
        // Update progress for current product
        setUploadProgress(prev => prev.map(p => 
          p.productId === product.id 
            ? { ...p, status: 'uploading' }
            : p
        ));

        try {
          const { data, error: uploadError } = await supabase.functions.invoke('upload-product-images', {
            body: { productId: product.id, userId: user.id }
          });

          if (uploadError || !data?.success) {
            throw new Error(data?.message || uploadError?.message || 'Error desconocido');
          }

          // Update progress for successful upload
          setUploadProgress(prev => prev.map(p => 
            p.productId === product.id 
              ? { ...p, status: 'success', message: data.message }
              : p
          ));

          successCount++;
        } catch (error) {
          // Update progress for failed upload
          setUploadProgress(prev => prev.map(p => 
            p.productId === product.id 
              ? { 
                  ...p, 
                  status: 'error', 
                  message: error instanceof Error ? error.message : 'Error desconocido' 
                }
              : p
          ));
          errorCount++;
        }

        // Update overall progress
        const currentProgress = ((i + 1) / productsWithImages.length) * 100;
        setOverallProgress(currentProgress);
      }

      toast({
        title: "✅ Subida completada",
        description: `${successCount} productos subidos exitosamente${errorCount > 0 ? `, ${errorCount} fallaron` : ''}`,
      });

    } catch (error) {
      console.error('Error in bulk upload:', error);
      toast({
        title: "❌ Error",
        description: "Error al procesar la subida masiva de imágenes",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full bg-gray-300" />;
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'uploading':
        return 'bg-blue-100 text-blue-700';
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'error':
        return 'bg-red-100 text-red-700';
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Debes estar autenticado para usar esta función.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Subida Masiva de Imágenes
        </CardTitle>
        <CardDescription>
          Sube todas las imágenes de tus productos existentes a la herramienta de búsqueda por imagen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleBulkUpload}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isUploading ? 'Subiendo...' : 'Subir Todas las Imágenes'}
        </Button>

        {isUploading && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso general</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="w-full" />
            </div>

            {uploadProgress.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <h4 className="font-medium text-sm">Productos:</h4>
                {uploadProgress.map((progress) => (
                  <div key={progress.productId} className="flex items-center gap-3 p-2 rounded-lg border">
                    {getStatusIcon(progress.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{progress.productName}</p>
                      {progress.message && (
                        <p className="text-xs text-muted-foreground truncate">{progress.message}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className={getStatusColor(progress.status)}>
                      {progress.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkImageUploader;
