import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface AdminBulkImageUploaderProps {
  userDetails: Array<{
    user_id: string;
    email: string;
    business_name?: string;
  }>;
}

interface UploadProgress {
  userId: string;
  userName: string;
  productId: string;
  productName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
}

export const AdminBulkImageUploader = ({ userDetails }: AdminBulkImageUploaderProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const { toast } = useToast();

  const handleBulkUpload = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Por favor selecciona un usuario",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setProgress([]);
    setOverallProgress(0);

    try {
      // Obtener productos del usuario seleccionado
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, images, user_id')
        .eq('user_id', selectedUserId)
        .eq('is_active', true);

      if (productsError) throw productsError;

      if (!products || products.length === 0) {
        toast({
          title: "Sin productos",
          description: "Este usuario no tiene productos activos con imágenes",
        });
        setIsUploading(false);
        return;
      }

      // Filtrar solo productos que tienen imágenes
      const productsWithImages = products.filter(
        p => p.images && Array.isArray(p.images) && p.images.length > 0
      );

      if (productsWithImages.length === 0) {
        toast({
          title: "Sin imágenes",
          description: "Los productos de este usuario no tienen imágenes",
        });
        setIsUploading(false);
        return;
      }

      const userName = userDetails.find(u => u.user_id === selectedUserId)?.business_name 
        || userDetails.find(u => u.user_id === selectedUserId)?.email 
        || 'Usuario';

      // Inicializar progreso
      const initialProgress: UploadProgress[] = productsWithImages.map(p => ({
        userId: selectedUserId,
        userName,
        productId: p.id,
        productName: p.name,
        status: 'pending' as const,
      }));
      setProgress(initialProgress);

      let completedCount = 0;

      // Procesar cada producto
      for (let i = 0; i < productsWithImages.length; i++) {
        const product = productsWithImages[i];
        
        // Actualizar estado a "uploading"
        setProgress(prev => prev.map(p => 
          p.productId === product.id 
            ? { ...p, status: 'uploading' as const }
            : p
        ));

        try {
          // Llamar a la edge function
          const { data, error } = await supabase.functions.invoke('upload-product-images', {
            body: { 
              productId: product.id, 
              userId: selectedUserId 
            }
          });

          if (error) throw error;

          // Actualizar estado a "success"
          setProgress(prev => prev.map(p => 
            p.productId === product.id 
              ? { 
                  ...p, 
                  status: 'success' as const,
                  message: data?.message || `${data?.uploaded || 0} imágenes subidas`
                }
              : p
          ));

          completedCount++;
        } catch (error) {
          console.error(`Error uploading images for product ${product.id}:`, error);
          
          // Actualizar estado a "error"
          setProgress(prev => prev.map(p => 
            p.productId === product.id 
              ? { 
                  ...p, 
                  status: 'error' as const,
                  message: error instanceof Error ? error.message : 'Error desconocido'
                }
              : p
          ));
        }

        // Actualizar progreso general
        setOverallProgress(Math.round(((i + 1) / productsWithImages.length) * 100));
      }

      toast({
        title: "Proceso completado",
        description: `Se procesaron ${completedCount} de ${productsWithImages.length} productos`,
      });

    } catch (error) {
      console.error('Error in bulk upload:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Error al procesar imágenes',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'uploading':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Subida Masiva de Imágenes a Railway
        </CardTitle>
        <CardDescription>
          Sube imágenes de productos al servidor de búsqueda por imagen. Selecciona un usuario para procesar sus productos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Usuario</label>
          <Select 
            value={selectedUserId} 
            onValueChange={setSelectedUserId}
            disabled={isUploading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un usuario" />
            </SelectTrigger>
            <SelectContent>
              {userDetails?.map(user => (
                <SelectItem key={user.user_id} value={user.user_id}>
                  {user.business_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleBulkUpload} 
          disabled={!selectedUserId || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Subiendo imágenes...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Subir Imágenes
            </>
          )}
        </Button>

        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso general</span>
              <span className="font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} />
          </div>
        )}

        {progress.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="text-sm font-medium">Estado por producto:</h3>
            {progress.map((item) => (
              <div
                key={item.productId}
                className={`p-3 rounded-lg border ${getStatusColor(item.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <span className="font-medium text-sm">{item.productName}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.status === 'pending' && 'Pendiente'}
                    {item.status === 'uploading' && 'Subiendo...'}
                    {item.status === 'success' && 'Completado'}
                    {item.status === 'error' && 'Error'}
                  </Badge>
                </div>
                {item.message && (
                  <p className="text-xs mt-1 opacity-80">{item.message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
