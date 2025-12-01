import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Package, MessageCircle, ChevronLeft, ChevronRight, Plus, Minus, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/utils';
import DOMPurify from 'dompurify';

interface ProductVariant {
  id: string;
  title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  price: number;
  compare_at_price: number | null;
  inventory_quantity: number;
  sku: string | null;
  barcode: string | null;
  available: boolean;
  weight: number | null;
  weight_unit: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: any[];
  stock: number;
  category: string;
  is_active: boolean;
  product_variants?: ProductVariant[];
}

interface StoreData {
  store_name: string;
  store_description: string;
  logo_url: string;
  banner_url: string;
  primary_color: string;
  accent_color: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string; // Número del agente de WhatsApp
  address: string;
  user_id: string;
}

const ProductDetail = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{[key: string]: string}>({});
  const [showCartDialog, setShowCartDialog] = useState(false);

  useEffect(() => {
    if (slug && productId) {
      fetchProductData();
    }
  }, [slug, productId]);

  const fetchProductData = async () => {
    if (!slug || !productId) return;

    console.log('ProductDetail: fetchProductData called with:', { slug, productId });
    setLoading(true);
    try {
      // Fetch store settings
      console.log('ProductDetail: Fetching store settings for slug:', slug);
      const { data: storeSettings, error: storeError } = await supabase
        .from('public_store_cache')
        .select('*')
        .eq('store_slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      console.log('ProductDetail: Store settings result:', { storeSettings, storeError });

      if (storeError) throw storeError;

      if (!storeSettings) {
        console.log('ProductDetail: No store settings found for slug:', slug);
        toast.error('Tienda no encontrada');
        return;
      }

      // Fetch public store options (including WhatsApp number) via RPC with proper RLS
      const { data: publicOptions, error: publicOptionsError } = await supabase
        .rpc('get_store_public_options', { store_slug_param: slug });

      if (publicOptionsError) {
        console.error('ProductDetail: Error fetching public store options:', publicOptionsError);
      }

      const optionsRow = publicOptions && publicOptions.length > 0 ? publicOptions[0] : null;

      const normalizedStoreData: StoreData = {
        store_name: storeSettings.store_name,
        store_description: storeSettings.store_description,
        logo_url: storeSettings.logo_url,
        banner_url: storeSettings.banner_url,
        primary_color: storeSettings.primary_color,
        accent_color: storeSettings.accent_color,
        contact_email: (optionsRow as any)?.contact_email || (storeSettings as any).contact_email || '',
        contact_phone: (optionsRow as any)?.contact_phone || (storeSettings as any).contact_phone || '',
        whatsapp_number: (optionsRow as any)?.whatsapp_number || '', // Número de WhatsApp obtenido de la función pública
        address: (optionsRow as any)?.address || (storeSettings as any).address || '',
        user_id: storeSettings.user_id,
      };
      setStoreData(normalizedStoreData);

      // Fetch specific product with variants
      console.log('ProductDetail: Fetching product with ID:', productId, 'for user:', storeSettings.user_id);
      const { data: productData, error: productError } = await supabase
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
        .eq('id', productId)
        .eq('user_id', storeSettings.user_id)
        .eq('is_active', true)
        .maybeSingle();

      console.log('ProductDetail: Product result:', { productData, productError });

      if (productError) throw productError;

      if (!productData) {
        console.log('ProductDetail: No product found with ID:', productId);
        toast.error('Producto no encontrado');
        return;
      }

      const processedProduct = {
        ...productData,
        images: Array.isArray(productData.images) ? productData.images : []
      };
      
      console.log('ProductDetail: Processed product:', processedProduct);
      console.log('ProductDetail: Product variants:', productData.product_variants);
      console.log('ProductDetail: Variants length:', productData.product_variants?.length);
      setProduct(processedProduct);

      // Set default variant if variants exist
      if (productData.product_variants && productData.product_variants.length > 0) {
        console.log('ProductDetail: Setting default variant');
        const defaultVariant = productData.product_variants[0];
        setSelectedVariant(defaultVariant);
        
        // Set default options
        const defaultOptions: {[key: string]: string} = {};
        if (defaultVariant.option1) defaultOptions.option1 = defaultVariant.option1;
        if (defaultVariant.option2) defaultOptions.option2 = defaultVariant.option2;
        if (defaultVariant.option3) defaultOptions.option3 = defaultVariant.option3;
        console.log('ProductDetail: Default options:', defaultOptions);
        setSelectedOptions(defaultOptions);
      } else {
        console.log('ProductDetail: No variants found for product');
      }
    } catch (error) {
      console.error('ProductDetail: Error fetching product data:', error);
      toast.error('Error al cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  // Get unique option values for each option type
  const getOptionValues = (optionType: 'option1' | 'option2' | 'option3') => {
    if (!product?.product_variants) return [];
    const values = product.product_variants
      .map(variant => variant[optionType])
      .filter(Boolean);
    return [...new Set(values)] as string[];
  };

  // Get option names (e.g., "Color", "Talla")
  const getOptionNames = () => {
    if (!product?.product_variants || product.product_variants.length === 0) return [];
    
    const names: string[] = [];
    const firstVariant = product.product_variants[0];
    
    if (firstVariant.option1) names.push('Opción 1');
    if (firstVariant.option2) names.push('Opción 2'); 
    if (firstVariant.option3) names.push('Opción 3');
    
    return names;
  };

  // Find variant based on selected options
  const findVariantByOptions = (options: {[key: string]: string}) => {
    if (!product?.product_variants) return null;
    
    return product.product_variants.find(variant => {
      return (!options.option1 || variant.option1 === options.option1) &&
             (!options.option2 || variant.option2 === options.option2) &&
             (!options.option3 || variant.option3 === options.option3);
    });
  };

  // Handle option selection
  const handleOptionChange = (optionType: string, value: string) => {
    const newOptions = { ...selectedOptions, [optionType]: value };
    setSelectedOptions(newOptions);
    
    const variant = findVariantByOptions(newOptions);
    if (variant) {
      setSelectedVariant(variant);
    }
  };

  // Get current price (from variant or product)
  const getCurrentPrice = () => {
    return selectedVariant?.price || product?.price || 0;
  };

  // Check if product is available
  const isAvailable = () => {
    if (selectedVariant) {
      return selectedVariant.available && selectedVariant.inventory_quantity > 0;
    }
    return product ? product.stock > 0 : false;
  };

  const contactWhatsApp = () => {
    if (storeData && (storeData.whatsapp_number || storeData.contact_phone) && product) {
      const rawPhone = storeData.whatsapp_number || storeData.contact_phone;
      const phone = rawPhone.replace(/\D/g, '');
      
      // Create detailed product info
      let productInfo = `- ${product.name}`;
      
      // Add variant info if available
      if (selectedVariant) {
        const variantDetails: string[] = [];
        if (selectedVariant.option1) variantDetails.push(selectedVariant.option1);
        if (selectedVariant.option2) variantDetails.push(selectedVariant.option2);
        if (selectedVariant.option3) variantDetails.push(selectedVariant.option3);
        
        if (variantDetails.length > 0) {
          productInfo += ` (${variantDetails.join(', ')})`;
        }
      }
      
      productInfo += ` (x${quantity}) - ${formatPrice(getCurrentPrice() * quantity)}`;
      
      const message = `Hola! Quiero hacer un pedido de ${storeData.store_name}:
  
${productInfo}
  
Total: ${formatPrice(getCurrentPrice() * quantity)}
  
¿Podrían ayudarme con este pedido?`;
  
      const url = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
      window.open(url, '_blank');
    }
  };
  const addToCart = () => {
    if (!product || !storeData) return;
    
    const cartKey = `cart_${slug}`;
    const existingCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    // Create cart item with variant info
    const cartItem = {
      product: {
        ...product,
        selectedVariant: selectedVariant,
        selectedOptions: selectedOptions,
        currentPrice: getCurrentPrice()
      },
      quantity: quantity
    };
    
    // Find existing item with same product and variant
    const existingItemIndex = existingCart.findIndex((item: any) => {
      if (item.product.id !== product.id) return false;
      
      // If both have variants, compare variant IDs
      if (selectedVariant && item.product.selectedVariant) {
        return item.product.selectedVariant.id === selectedVariant.id;
      }
      
      // If neither has variants, they're the same
      return !selectedVariant && !item.product.selectedVariant;
    });
    
    if (existingItemIndex >= 0) {
      existingCart[existingItemIndex].quantity += quantity;
    } else {
      existingCart.push(cartItem);
    }
    
    localStorage.setItem(cartKey, JSON.stringify(existingCart));
    
    // Dispatch custom event to update cart count in header
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    
    let variantText = '';
    if (selectedVariant) {
      const variantDetails: string[] = [];
      if (selectedVariant.option1) variantDetails.push(selectedVariant.option1);
      if (selectedVariant.option2) variantDetails.push(selectedVariant.option2);
      if (selectedVariant.option3) variantDetails.push(selectedVariant.option3);
      
      if (variantDetails.length > 0) {
        variantText = ` (${variantDetails.join(', ')})`;
      }
    }
    
    toast.success(`${product.name}${variantText} añadido al carrito (${quantity} ${quantity === 1 ? 'unidad' : 'unidades'})`);
    setShowCartDialog(true);
  };

  const updateQuantity = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  const nextImage = () => {
    if (product && product.images.length > 0) {
      setSelectedImageIndex((prev) => 
        prev === product.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (product && product.images.length > 0) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? product.images.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!storeData || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Producto no encontrado</h1>
          <p className="text-muted-foreground">El producto que buscas no existe o no está activo.</p>
          <Button 
            onClick={() => navigate(`/store/${slug}`)} 
            className="mt-4"
          >
            Volver a la tienda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Custom CSS for dynamic colors */}
      <style>
        {`
          :root {
            --store-primary: ${storeData.primary_color};
            --store-accent: ${storeData.accent_color};
          }
          .store-primary-bg { background-color: var(--store-primary); }
          .store-primary-text { color: var(--store-primary); }
          .store-accent-bg { background-color: var(--store-accent); }
          .store-accent-text { color: var(--store-accent); }
        `}
      </style>

      {/* Header */}
      <header className="store-primary-bg text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/store/${slug}`)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la tienda
            </Button>
            {storeData.logo_url && (
              <img 
                src={storeData.logo_url} 
                alt={storeData.store_name}
                className="w-8 h-8 object-contain bg-white rounded p-1"
              />
            )}
            <h1 className="text-lg font-semibold">{storeData.store_name}</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <>
                  <img
                    src={getImageUrl(product.images[selectedImageIndex])}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {product.images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-80 hover:opacity-100"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-80 hover:opacity-100"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
              {!isAvailable() && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Badge variant="destructive" className="text-lg px-4 py-2">Agotado</Badge>
                </div>
              )}
            </div>
            
            {/* Image thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 ${
                      selectedImageIndex === index 
                        ? 'border-primary' 
                        : 'border-muted'
                    }`}
                  >
                    <img
                      src={getImageUrl(image)}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{product.name}</h1>
              {product.category && (
                <Badge variant="secondary" className="mb-4">
                  {product.category}
                </Badge>
              )}
              <p className="text-3xl font-bold store-primary-text mb-6">
                {formatPrice(getCurrentPrice())}
              </p>

              {/* Variant Selection - More prominent */}
              {product.product_variants && product.product_variants.length > 0 && (
                <Card className="mb-6 border-2">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Selecciona las opciones:</h3>
                    <div className="space-y-4">
                       {getOptionValues('option1').length > 0 && (
                        <div>
                          <label className="text-sm font-semibold text-foreground mb-2 block uppercase">
                            Talla
                          </label>
                          <Select
                            value={selectedOptions.option1 || ''}
                            onValueChange={(value) => handleOptionChange('option1', value)}
                          >
                            <SelectTrigger className="w-full h-12 text-base font-medium">
                              <SelectValue placeholder="Selecciona una talla" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {getOptionValues('option1').map((value) => (
                                <SelectItem key={value} value={value} className="text-base">
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {getOptionValues('option2').length > 0 && (
                        <div>
                          <label className="text-sm font-semibold text-foreground mb-2 block uppercase">
                            Color
                          </label>
                          <Select
                            value={selectedOptions.option2 || ''}
                            onValueChange={(value) => handleOptionChange('option2', value)}
                          >
                            <SelectTrigger className="w-full h-12 text-base font-medium">
                              <SelectValue placeholder="Selecciona un color" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {getOptionValues('option2').map((value) => (
                                <SelectItem key={value} value={value} className="text-base">
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {getOptionValues('option3').length > 0 && (
                        <div>
                          <label className="text-sm font-semibold text-foreground mb-2 block uppercase">
                            Opción 3
                          </label>
                          <Select
                            value={selectedOptions.option3 || ''}
                            onValueChange={(value) => handleOptionChange('option3', value)}
                          >
                            <SelectTrigger className="w-full h-12 text-base font-medium">
                              <SelectValue placeholder="Selecciona una opción" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {getOptionValues('option3').map((value) => (
                                <SelectItem key={value} value={value} className="text-base">
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedVariant && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">
                            Stock disponible: <span className="font-semibold text-foreground">{selectedVariant.inventory_quantity}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {product.description && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-3">Descripción</h2>
                  <div 
                    className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(product.description, {
                        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'span', 'div'],
                        ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
                      })
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-foreground">Cantidad:</span>
                <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateQuantity(-1)}
                    className="h-8 w-8 p-0"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="font-semibold px-3">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateQuantity(1)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {/* First row: Add to cart and Back to store */}
                <div className="flex gap-3">
                  <Button
                    onClick={addToCart}
                    className="flex-1 store-primary-bg hover:opacity-90 text-white font-semibold"
                    disabled={!isAvailable()}
                    size="lg"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Añadir al carrito
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/store/${slug}`)}
                    className="px-6"
                    size="lg"
                  >
                    Volver a la tienda
                  </Button>
                </div>

                {/* Second row: WhatsApp button */}
                {storeData && (storeData.whatsapp_number || storeData.contact_phone) && (
                  <Button
                    onClick={contactWhatsApp}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                    size="lg"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Contactar por WhatsApp
                  </Button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Cart Confirmation Dialog */}
      <AlertDialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Producto añadido al carrito</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Qué deseas hacer ahora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => navigate(`/store/${slug}`)}>
              Seguir comprando
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                navigate(`/store/${slug}`);
                // Trigger cart open after navigation
                setTimeout(() => {
                  const cartButton = document.querySelector('[data-cart-trigger]') as HTMLElement;
                  if (cartButton) cartButton.click();
                }, 100);
              }}
              className="store-primary-bg text-white"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Ver carrito y finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductDetail;