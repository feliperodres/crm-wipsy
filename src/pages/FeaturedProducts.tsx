import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Star, Loader2, Search } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: any;
  category: string | null;
  stock: number;
  is_featured?: boolean;
}

const FeaturedProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cargar productos destacados desde metadata del perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('special_instructions')
        .eq('user_id', user?.id)
        .single();

      let featuredIds: string[] = [];
      if (profile?.special_instructions) {
        try {
          const parsed = JSON.parse(profile.special_instructions);
          featuredIds = parsed.featured_products || [];
        } catch {
          // Si no es JSON válido, ignorar
        }
      }

      setProducts(data || []);
      setSelectedProducts(new Set(featuredIds));
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Obtener las instrucciones especiales actuales
      const { data: profile } = await supabase
        .from('profiles')
        .select('special_instructions')
        .eq('user_id', user?.id)
        .single();

      let currentInstructions: any = {};
      if (profile?.special_instructions) {
        try {
          currentInstructions = JSON.parse(profile.special_instructions);
        } catch {
          currentInstructions = {};
        }
      }

      // Actualizar solo los productos destacados
      currentInstructions.featured_products = Array.from(selectedProducts);

      const { error } = await supabase
        .from('profiles')
        .update({ 
          special_instructions: JSON.stringify(currentInstructions)
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Productos destacados actualizados correctamente');
    } catch (error) {
      console.error('Error saving featured products:', error);
      toast.error('Error al guardar productos destacados');
    } finally {
      setSaving(false);
    }
  };

  const getImageUrl = (images: any[]) => {
    if (!images || images.length === 0) return null;
    const firstImage = images[0];
    return typeof firstImage === 'string' ? firstImage : firstImage?.url;
  };

  const filteredProducts = products
    .filter(product => 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Ordenar: seleccionados primero
      const aSelected = selectedProducts.has(a.id);
      const bSelected = selectedProducts.has(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Productos Destacados</h1>
            <p className="text-muted-foreground mt-2">
              Busca y selecciona los productos que están en anuncios o promociones
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Star className="h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No tienes productos activos. Agrega productos primero para poder destacarlos.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4" />
                <span>{selectedProducts.size} productos seleccionados</span>
              </div>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No se encontraron productos que coincidan con tu búsqueda.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  const imageUrl = getImageUrl(product.images);
                  const isSelected = selectedProducts.has(product.id);

                  return (
                    <Card 
                      key={product.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => toggleProduct(product.id)}
                    >
                      {imageUrl && (
                        <div className="aspect-square w-full overflow-hidden rounded-t-lg bg-muted">
                          <img 
                            src={imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isSelected && <Star className="h-4 w-4 text-primary fill-primary" />}
                              <CardTitle className="text-base truncate">{product.name}</CardTitle>
                            </div>
                            <CardDescription className="line-clamp-2 mt-1">
                              {product.description || 'Sin descripción'}
                            </CardDescription>
                          </div>
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleProduct(product.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-lg text-foreground">
                            ${product.price.toLocaleString()}
                          </span>
                          {product.category && (
                            <Badge variant="secondary" className="text-xs">
                              {product.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>Stock: {product.stock}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FeaturedProducts;
