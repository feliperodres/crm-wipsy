import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Package, Image as ImageIcon, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: any[];
  cover_image_index: number;
  stock: number;
  is_active: boolean;
}

interface ProductSelectorProps {
  onProductSelect: (product: Product, imageUrl: string) => void;
  children: React.ReactNode;
}

export const ProductSelector = ({ onProductSelect, children }: ProductSelectorProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open]);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mappedProducts = (data || []).map(product => ({
        ...product,
        images: Array.isArray(product.images) ? product.images : []
      }));
      setProducts(mappedProducts);
      setFilteredProducts(mappedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (product: Product, imageIndex: number) => {
    const imageUrl = product.images[imageIndex];
    onProductSelect(product, imageUrl);
    setOpen(false);
    toast({
      title: "Producto seleccionado",
      description: `Se enviará la imagen ${imageIndex + 1} de ${product.name}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Seleccionar Producto
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No se encontraron productos' : 'No tienes productos activos'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Product Info */}
                      <div>
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                         <div className="flex items-center gap-2 mt-2">
                           <Badge variant="secondary">
                             ${product.price.toLocaleString()}
                           </Badge>
                         </div>
                      </div>
                      
                      {/* Images */}
                      {product.images && product.images.length > 0 ? (
                        <div>
                          <p className="text-sm font-medium mb-2">Seleccionar imagen:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {product.images.map((imageUrl, index) => (
                              <div
                                key={index}
                                className="relative aspect-square rounded-lg overflow-hidden border hover:border-primary cursor-pointer transition-colors"
                                onClick={() => handleImageSelect(product, index)}
                              >
                                <img
                                  src={imageUrl}
                                  alt={`${product.name} - Imagen ${index + 1}`}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Sin imágenes</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};