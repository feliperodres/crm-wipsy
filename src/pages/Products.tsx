import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, Package, ChevronDown, ChevronUp, Grid3X3, List, Search, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { PriceInput } from '@/components/ui/price-input';
import { useAuth } from '@/hooks/useAuth';
import { ProductVariants } from '@/components/products/ProductVariantsImproved';
import { CategorySelect } from '@/components/products/CategorySelect';
import VectorSearchDemo from '@/components/VectorSearchDemo';
import BulkImageUploader from '@/components/BulkImageUploader';
import { useOnboarding } from '@/hooks/useOnboarding';

interface ProductVariant {
  id?: string;
  title: string;
  option1?: string;
  option2?: string;
  option3?: string;
  price: number;
  compare_at_price?: number;
  inventory_quantity: number;
  sku?: string;
  barcode?: string;
  available: boolean;
  weight?: number;
  weight_unit: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string | null;
  images: string[];
  cover_image_index: number;
  is_active: boolean;
  created_at: string;
  product_type?: string;
  vendor?: string;
  tags?: string[];
  shopify_id?: string;
  source?: 'local' | 'shopify';
  raw_shopify_data?: any;
  product_variants?: ProductVariant[];
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const { toast } = useToast();
  const { user } = useAuth();
  const { triggerStepCompletion } = useOnboarding();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    images: [] as string[],
    cover_image_index: 0,
    product_type: '',
    vendor: '',
    tags: [] as string[]
  });

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  // Onboarding integration (removed auto-trigger to let user control the flow)
  // Users will manually click "Next" in the onboarding overlay

  const fetchProducts = async () => {
    if (!user) return;
    
    try {
      // Fetch all products (both local and Shopify) from the single products table
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_variants (
            id,
            title,
            option1,
            option2,
            option3,
            price,
            compare_at_price,
            inventory_quantity,
            sku,
            barcode,
            available,
            weight,
            weight_unit
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to ensure images is an array and add source info
      const transformedData = (data || []).map(product => {
        let images: string[] = [];
        
        if (typeof product.images === 'string') {
          try {
            const parsed = JSON.parse(product.images);
            images = Array.isArray(parsed) ? parsed.filter(img => typeof img === 'string') : [];
          } catch {
            images = [];
          }
        } else if (Array.isArray(product.images)) {
          // Handle both string arrays and object arrays
          images = product.images.map(img => {
            if (typeof img === 'string') return img;
            if (typeof img === 'object' && img !== null && 'url' in img) {
              return (img as any).url;
            }
            return null;
          }).filter(Boolean) as string[];
        }
        
        return {
          ...product,
          images,
          cover_image_index: product.cover_image_index || 0,
          source: product.shopify_id ? 'shopify' as const : 'local' as const
        };
      });
      
      setProducts(transformedData);
      setFilteredProducts(transformedData);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, products]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Format price for display
  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Form data before processing:', formData);
      
      // Validate required fields
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "El nombre del producto es requerido",
          variant: "destructive"
        });
        return;
      }
      
      if (!formData.price || parseFloat(formData.price) <= 0) {
        toast({
          title: "Error",
          description: "El precio debe ser mayor a 0",
          variant: "destructive"
        });
        return;
      }
      
      if (!formData.stock || parseInt(formData.stock) < 0) {
        toast({
          title: "Error",
          description: "El stock no puede ser negativo",
          variant: "destructive"
        });
        return;
      }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        category: formData.category || null,
        images: formData.images, // Keep as array for now
        cover_image_index: formData.cover_image_index,
        product_type: formData.product_type.trim() || null,
        vendor: formData.vendor.trim() || null,
        tags: formData.tags,
        user_id: user?.id
      };

      console.log('Product data to send:', productData);

      let error;
      let productId: string | null = null;

      if (editingProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        error = updateError;
        productId = editingProduct.id;
      } else {
        console.log('Attempting to insert product:', productData);
        const { data: insertData, error: insertError } = await supabase
          .from('products')
          .insert([productData])
          .select();
        
        console.log('Insert result:', { data: insertData, error: insertError });
        error = insertError;
        productId = insertData?.[0]?.id || null;
      }

      if (error) {
        console.error('Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          stack: error.stack
        });
        
        // Show more specific error to user
        toast({
          title: "Error específico",
          description: `Error de base de datos: ${error.message} (Código: ${error.code})`,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Product saved successfully, productId:', productId, 'userId:', user?.id);

      toast({
        title: "Éxito",
        description: editingProduct ? "Producto actualizado" : "Producto creado"
      });

      // Generate text embeddings for the product automatically
      if (productId && user?.id) {
        console.log('🔄 Starting text embedding generation for product:', productId);
        try {
          const { data: textEmbedRes, error: textEmbedErr } = await supabase.functions.invoke('generate-product-embeddings', {
            body: { productId, userId: user.id }
          });
          if (textEmbedErr) {
            console.error('❌ Text embedding error:', textEmbedErr);
            throw textEmbedErr;
          }
          console.log('✅ Text embeddings generated successfully:', textEmbedRes);
        } catch (embeddingError) {
          console.error('⚠️ Text embedding generation warning:', embeddingError);
          // Do not block the main flow if embeddings fail
        }
      } else {
        console.warn('⚠️ Skipping text embedding generation - missing productId or userId:', { productId, userId: user?.id });
      }


      // Generate image embeddings for the product automatically
      if (productId && user?.id && (formData.images?.length || 0) > 0) {
        try {
          const { data: imgEmbedRes, error: imgEmbedErr } = await supabase.functions.invoke('generate-product-image-embeddings', {
            body: { productId, userId: user.id }
          });
          if (imgEmbedErr) throw imgEmbedErr;
          console.log('Image embeddings generated:', imgEmbedRes);
        } catch (embeddingError) {
          console.warn('Image embedding generation warning:', embeddingError);
          // Do not block the main flow if embeddings fail
        }
      }

      // Upload images to external search tool (NEW FUNCTIONALITY)
      if (productId && user?.id && (formData.images?.length || 0) > 0) {
        try {
          // Use different function for updates vs new products
          const functionName = editingProduct ? 'handle-product-image-update' : 'upload-product-images';
          
          const { data: uploadRes, error: uploadErr } = await supabase.functions.invoke(functionName, {
            body: { productId, userId: user.id }
          });
          
          if (uploadErr) {
            console.warn('Image upload to external tool failed:', uploadErr);
          } else {
            console.log('Images uploaded to external search tool:', uploadRes);
            if (uploadRes?.uploaded > 0) {
              toast({
                title: "📷 Imágenes subidas",
                description: `${uploadRes.uploaded} imágenes ${editingProduct ? 'actualizadas' : 'subidas'} a la herramienta de búsqueda`,
              });
            }
          }
        } catch (uploadError) {
          console.warn('Image upload exception:', uploadError);
        }
      }

      // Sync to Shopify if product was imported from there
      if (editingProduct && productId && user?.id) {
        try {
          const { data: syncRes, error: syncErr } = await supabase.functions.invoke('shopify-sync-product', {
            body: { productId }
          });
          
          if (syncErr) {
            console.warn('Shopify sync failed:', syncErr);
          } else if (syncRes?.synced) {
            console.log('✅ Product synced to Shopify:', syncRes);
            toast({
              title: "🔄 Sincronizado con Shopify",
              description: "Los cambios se reflejaron en tu tienda Shopify",
            });
          }
        } catch (syncError) {
          console.warn('Shopify sync exception:', syncError);
        }
      }

      // Only close dialog and reset form for new products, not updates
      if (!editingProduct) {
        resetForm();
      }
      fetchProducts();
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: "Error",
        description: `No se pudo guardar el producto: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Delete in the correct order to avoid foreign key constraints
      
      // 1. Delete product embeddings (for AI agent)
      const { error: embeddingError } = await supabase
        .from('product_embeddings')
        .delete()
        .eq('product_id', id);

      if (embeddingError) {
        console.warn('Warning deleting embeddings:', embeddingError);
        // Don't throw here, continue with deletion
      }

      // 2. Delete product variants (CASCADE should handle this automatically)
      // Note: product_variants has ON DELETE CASCADE, so this is redundant but explicit

      // 3. Delete from agent inventory
      const { error: agentInventoryError } = await supabase
        .from('agent_inventory')
        .delete()
        .eq('product_id', id);

      if (agentInventoryError) {
        console.warn('Warning deleting from agent inventory:', agentInventoryError);
        // Don't throw here, continue with deletion
      }

      // 4. Finally delete the main product
      const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (productError) throw productError;

      toast({
        title: "Éxito",
        description: "Producto eliminado completamente del sistema"
      });

      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '',
      category: '',
      images: [],
      cover_image_index: 0,
      product_type: '',
      vendor: '',
      tags: []
    });
    setEditingProduct(null);
    setIsDialogOpen(false);
    setVariants([]);
  };

  const loadProductVariants = async (productId: string) => {
    try {
      console.log('Loading variants for product:', productId);
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('position', { ascending: true });

      if (error) {
        console.error('Supabase error loading variants:', error);
        throw error;
      }
      
      console.log('Loaded variants:', data);
      setVariants(data || []);
      return data || [];
    } catch (error) {
      console.error('Error loading variants:', error);
      setVariants([]);
      toast({
        title: "Advertencia",
        description: "No se pudieron cargar las variantes del producto. Podrás crear nuevas variantes.",
        variant: "destructive"
      });
      return [];
    }
  };

  const handleEdit = async (product: Product) => {
    try {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        stock: product.stock.toString(),
        category: product.category || '',
        images: product.images || [],
        cover_image_index: product.cover_image_index || 0,
        product_type: product.product_type || '',
        vendor: product.vendor || '',
        tags: product.tags || []
      });
      
      // Cargar las variantes del producto
      await loadProductVariants(product.id);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error loading product for editing:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el producto para editar. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const toggleDescription = (productId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const truncateText = (text: string, maxLines: number = 5) => {
    // Estimar palabras por línea basado en el ancho promedio de las tarjetas
    const wordsPerLine = 8; // Reducido para ser más conservador
    const maxWords = maxLines * wordsPerLine;
    
    const words = text.split(' ');
    if (words.length <= maxWords) {
      return text;
    }
    
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const shouldShowReadMore = (text: string) => {
    const words = text.split(' ');
    return words.length > 40; // Mostrar "ver más" si tiene más de 40 palabras
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Productos</h1>
            <p className="text-muted-foreground">
              {filteredProducts.length} de {products.length} productos
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                className="pl-10 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Database className="h-4 w-4 mr-2" />
                  Búsqueda IA
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Búsqueda Vectorial de Productos</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <VectorSearchDemo />
                  <BulkImageUploader />
                </div>
              </DialogContent>
            </Dialog>
            
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} data-testid="new-product-button">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Precio</Label>
                    <PriceInput
                      value={formData.price}
                      onChange={(value) => setFormData({ ...formData, price: String(value) })}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <CategorySelect
                    value={formData.category}
                    onChange={(value) => setFormData({ ...formData, category: value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product_type">Tipo de Producto</Label>
                    <Input
                      id="product_type"
                      value={formData.product_type}
                      onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                      placeholder="ej: Ropa, Electrónicos"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="vendor">Proveedor</Label>
                    <Input
                      id="vendor"
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      placeholder="ej: Nike, Apple"
                    />
                  </div>
                </div>
                
                <MultiImageUpload
                  images={formData.images}
                  onImagesChange={(images) => setFormData({ ...formData, images })}
                  coverImageIndex={formData.cover_image_index}
                  onCoverImageChange={(index) => setFormData({ ...formData, cover_image_index: index })}
                />

                {editingProduct && (
                  <ProductVariants
                    productId={editingProduct.id}
                    userId={user?.id || ''}
                    variants={variants}
                    onVariantsChange={setVariants}
                  />
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingProduct ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-280px)]">
          {viewMode === 'list' ? (
            <div className="space-y-3">
              {paginatedProducts.map((product) => {
                const coverImage = product.images && product.images.length > 0 
                  ? (product.images[product.cover_image_index] || product.images[0])
                  : null;
                
                return (
                  <Card key={product.id} className="shadow-sm hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {coverImage && (
                          <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                            <img 
                              src={coverImage} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-foreground truncate">{product.name}</h3>
                            <div className="flex items-center gap-2 ml-4">
                              {product.source === 'shopify' && (
                                <Badge variant="outline" className="text-xs">
                                  🛍️ Shopify
                                </Badge>
                              )}
                              <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
                                {product.is_active ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <span className="font-medium text-primary">${formatPrice(product.price)}</span>
                              {product.category && <span>Categoría: {product.category}</span>}
                              <span className={product.stock > 0 ? "text-green-600" : "text-red-600"}>
                                Stock: {product.stock}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(product)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. El producto "{product.name}" será eliminado permanentemente de tu inventario.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(product.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Sí, eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pr-4">
              {paginatedProducts.map((product) => {
                const coverImage = product.images && product.images.length > 0 
                  ? (product.images[product.cover_image_index] || product.images[0])
                  : null;
                
                return (
                  <Card key={product.id} className="shadow-card hover:shadow-elegant transition-all duration-300">
                    <CardHeader className="pb-3">
                      {coverImage && (
                        <div className="w-full h-32 bg-muted rounded-md mb-3 overflow-hidden">
                          <img 
                            src={coverImage} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                       )}
                       <div className="flex items-center justify-between">
                         <CardTitle className="text-lg">{product.name}</CardTitle>
                         <div className="flex gap-2">
                           {product.source === 'shopify' && (
                             <Badge variant="outline" className="text-xs">
                               🛍️ Shopify
                             </Badge>
                           )}
                           <Badge variant={product.is_active ? "default" : "secondary"}>
                             {product.is_active ? "Activo" : "Inactivo"}
                           </Badge>
                         </div>
                       </div>
                     </CardHeader>
                     
                     <CardContent>
                       {product.description && (
                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {expandedDescriptions.has(product.id) 
                              ? product.description 
                              : truncateText(product.description)
                            }
                          </p>
                          {shouldShowReadMore(product.description) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-auto text-xs text-primary hover:text-primary/80 mt-2 font-medium"
                              onClick={() => toggleDescription(product.id)}
                            >
                              {expandedDescriptions.has(product.id) ? (
                                <>
                                  Ver menos <ChevronUp className="h-3 w-3 ml-1" />
                                </>
                              ) : (
                                <>
                                  Ver más <ChevronDown className="h-3 w-3 ml-1" />
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Precio:</span>
                          <span className="font-semibold">${formatPrice(product.price)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Stock:</span>
                          <Badge variant={product.stock > 5 ? "default" : "destructive"}>
                            {product.stock} unidades
                          </Badge>
                        </div>
                        
                        {product.category && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Categoría:</span>
                            <span className="text-sm">{product.category}</span>
                          </div>
                        )}

                        {product.images && product.images.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Imágenes:</span>
                            <span className="text-sm">{product.images.length} imagen{product.images.length !== 1 ? 'es' : ''}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. El producto "{product.name}" será eliminado permanentemente de tu inventario.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(product.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Sí, eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                    className="w-10 h-10"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {filteredProducts.length === 0 && products.length > 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No se encontraron productos
            </h3>
            <p className="text-muted-foreground mb-4">
              Intenta cambiar los términos de búsqueda
            </p>
          </div>
        )}

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No hay productos
            </h3>
            <p className="text-muted-foreground mb-4">
              Comienza agregando tu primer producto al catálogo
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Producto
            </Button>
          </div>
        )}
      </div>

    </DashboardLayout>
  );
}