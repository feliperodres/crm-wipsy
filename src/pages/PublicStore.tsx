import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, ShoppingCart, Search, Plus, Minus, MessageCircle, Store as StoreIcon } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  stock: number;
  category: string;
  is_active: boolean;
}
interface PaymentMethods {
  cash_on_delivery: boolean;
  bank_transfer: boolean;
  instructions: string;
}

interface ShippingRate {
  id: string;
  name: string;
  price: number;
  condition_type: string;
  condition_value: number;
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
  address: string;
  user_id: string;
  show_out_of_stock: boolean;
  show_whatsapp_button: boolean;
  whatsapp_number: string;
  shipping_rates: ShippingRate[];
  payment_methods: PaymentMethods;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface OrderData {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  shipping_tariff_id?: string;
  payment_method?: 'cash_on_delivery' | 'bank_transfer';
}

// Helper type for RPC response
interface StorePublicOptions {
  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  address?: string;
  show_out_of_stock?: boolean;
  show_whatsapp_button?: boolean;
  shipping_rates?: unknown; // RPC returns JSON/any
  payment_methods?: unknown; // RPC returns JSON/any
}

const PublicStore = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderData, setOrderData] = useState<OrderData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    shipping_tariff_id: '',
    payment_method: undefined,
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const loadCartFromStorage = useCallback(() => {
    if (!slug) return;
    const cartKey = `cart_${slug}`;
    const savedCart = localStorage.getItem(cartKey);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from storage:', error);
      }
    }
  }, [slug]);

  const fetchStoreData = useCallback(async () => {
    if (!slug) return;

    setLoading(true);
    try {
      // Fetch public store data from secure cache
      const { data: storeCache, error: storeError } = await supabase
        .from('public_store_cache')
        .select('*')
        .eq('store_slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (storeError) throw storeError;

      if (!storeCache) {
        toast.error('Tienda no encontrada');
        return;
      }

      // Fetch contact information, shipping rates and payment methods securely via RPC (bypasses RLS safely)
      let storeSettings: StorePublicOptions | null = null;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_store_public_options', {
          store_slug_param: slug,
        });
        if (rpcError) throw rpcError;
        storeSettings = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as StorePublicOptions;
      } catch (e) {
        console.warn('RPC get_store_public_options failed:', e);
      }

      // Fallback: try direct table read (may work if user is authenticated in preview)
      if (!storeSettings) {
        try {
          const { data, error } = await supabase
            .from('store_settings')
            .select('contact_email, contact_phone, whatsapp_number, address, show_out_of_stock, show_whatsapp_button, shipping_rates, payment_methods')
            .eq('store_slug', slug)
            .eq('is_active', true)
            .maybeSingle();
          if (!error) storeSettings = data as unknown as StorePublicOptions;
        } catch (e) {
          console.warn('Direct store_settings select failed as well:', e);
        }
      }

      // Combine public data with store settings
      const parsedShippingRates = (() => {
        const raw = storeSettings?.shipping_rates;
        try {
          if (Array.isArray(raw)) return raw as ShippingRate[];
          if (typeof raw === 'string') return JSON.parse(raw) as ShippingRate[];
          if (raw && typeof raw === 'object' && 'rates' in raw) return (raw.rates || []) as ShippingRate[];
          return [] as ShippingRate[];
        } catch {
          return [] as ShippingRate[];
        }
      })();

      const parsedPaymentMethods: PaymentMethods = (() => {
        const raw = storeSettings?.payment_methods;
        try {
          const pm = typeof raw === 'string' ? JSON.parse(raw) : raw;
          return {
            cash_on_delivery: pm?.cash_on_delivery ?? true,
            bank_transfer: pm?.bank_transfer ?? true,
            instructions: pm?.instructions ?? ''
          } as PaymentMethods;
        } catch {
          return { cash_on_delivery: true, bank_transfer: true, instructions: '' } as PaymentMethods;
        }
      })();

      const finalStoreData = {
        ...storeCache,
        contact_email: storeSettings?.contact_email || '',
        contact_phone: storeSettings?.contact_phone || '',
        whatsapp_number: storeSettings?.whatsapp_number || '',
        address: storeSettings?.address || '',
        show_out_of_stock: storeSettings?.show_out_of_stock ?? true,
        show_whatsapp_button: storeSettings?.show_whatsapp_button ?? true,
        shipping_rates: parsedShippingRates,
        payment_methods: parsedPaymentMethods,
      } as StoreData;

      setStoreData(finalStoreData);

      // Fetch products for this store
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', finalStoreData.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      let processedProducts = (productsData || []).map(product => ({
        ...product,
        images: Array.isArray(product.images) ? product.images : []
      })) as Product[];

      // Filter out of stock products if setting is disabled
      if (!finalStoreData.show_out_of_stock) {
        processedProducts = processedProducts.filter(p => p.stock > 0);
      }

      setProducts(processedProducts);
    } catch (error) {
      console.error('Error fetching store data:', error);
      toast.error('Error al cargar la tienda');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      fetchStoreData();
      loadCartFromStorage();
    }
  }, [slug, fetchStoreData, loadCartFromStorage]);


  useEffect(() => {
    const handleCartUpdate = () => {
      loadCartFromStorage();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [slug, loadCartFromStorage]);

  // Auto-select defaults for shipping and payment when only one option
  useEffect(() => {
    if (!storeData) return;
    // Auto-select shipping if only one rate
    if (storeData.shipping_rates && storeData.shipping_rates.length === 1 && !orderData.shipping_tariff_id) {
      setOrderData(prev => ({ ...prev, shipping_tariff_id: storeData.shipping_rates[0].id }));
    }
    // Auto-select payment if only one available
    const pm = storeData.payment_methods;
    const available: ('cash_on_delivery' | 'bank_transfer')[] = [];
    if (pm?.cash_on_delivery) available.push('cash_on_delivery');
    if (pm?.bank_transfer) available.push('bank_transfer');
    if (available.length === 1 && !orderData.payment_method) {
      setOrderData(prev => ({ ...prev, payment_method: available[0] }));
    }
  }, [storeData, orderData.shipping_tariff_id, orderData.payment_method]);

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const contactWhatsApp = () => {
    if (storeData?.contact_phone) {
      const phone = storeData.contact_phone.replace(/\D/g, '');
      const message = `Hola! Me interesa conocer más sobre los productos de ${storeData.store_name}. ¿Podrían ayudarme?`;
      const url = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
      window.open(url, '_blank');
    }
  };

  const contactWhatsAppForProduct = (product: Product) => {
    if (storeData?.whatsapp_number) {
      const phone = storeData.whatsapp_number.replace(/\D/g, '');
      const message = `Hola! Me interesa este producto de ${storeData.store_name}:\n\n${product.name}\n${formatPrice(product.price)}\n\n¿Podrían ayudarme?`;
      const url = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
      window.open(url, '_blank');
    }
  };

  const addToCart = (product: Product) => {
    const newCart = (() => {
      const existing = cart.find(item => item.product.id === product.id);
      if (existing) {
        return cart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      }
      return [...cart, { product, quantity: 1 }];
    })();

    setCart(newCart);

    // Save to localStorage
    if (slug) {
      const cartKey = `cart_${slug}`;
      localStorage.setItem(cartKey, JSON.stringify(newCart));
    }

    toast.success(`${product.name} agregado al carrito`);
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, change: number) => {
    const newCart = cart.map(item => {
      if (item.product.id === productId) {
        const newQuantity = Math.max(0, Math.min(item.quantity + change, item.product.stock));
        return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean) as CartItem[];

    setCart(newCart);
    
    // Save to localStorage
    if (slug) {
      const cartKey = `cart_${slug}`;
      localStorage.setItem(cartKey, JSON.stringify(newCart));
    }
  };

  const removeFromCart = (productId: string) => {
    const newCart = cart.filter(item => item.product.id !== productId);
    setCart(newCart);
    
    // Save to localStorage
    if (slug) {
      const cartKey = `cart_${slug}`;
      localStorage.setItem(cartKey, JSON.stringify(newCart));
    }
    
    toast.success('Producto eliminado del carrito');
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const getShippingCost = () => {
    if (!orderData.shipping_tariff_id || !storeData?.shipping_rates) return 0;
    const selectedRate = storeData.shipping_rates.find(rate => rate.id === orderData.shipping_tariff_id);
    if (!selectedRate) return 0;

    const subtotal = getSubtotal();
    if (selectedRate.condition_type === 'minimum_order' && subtotal >= selectedRate.condition_value) {
      return 0;
    }
    return selectedRate.price;
  };

  const getTotalPrice = () => {
    return getSubtotal() + getShippingCost();
  };

  const submitOrderDirectly = async () => {
    if (!storeData || cart.length === 0) return;

    setSubmittingOrder(true);
    try {
      const selectedShipping = storeData.shipping_rates?.find(r => r.id === orderData.shipping_tariff_id);
      const paymentText = orderData.payment_method === 'cash_on_delivery' ? 'Contra entrega' : 'Transferencia';

      const productsPayload = cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      const { data, error } = await supabase.functions.invoke('create-order-from-agent', {
        body: {
          customer_name: orderData.name,
          customer_last_name: '',
          customer_address: orderData.address,
          customer_phone: orderData.phone,
          customer_email: orderData.email,
          products: productsPayload,
          Departamento: '',
          ciudad: '',
          forma_de_pago: paymentText,
          user_id: storeData.user_id,
          shipping_tariff: selectedShipping ? { id: selectedShipping.id, name: selectedShipping.name } : orderData.shipping_tariff_id,
          order_source: 'store',
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || 'Edge function failed');
      }

      // Clear cart and state
      setCart([]);
      if (slug) localStorage.removeItem(`cart_${slug}`);
      setOrderData({ name: '', phone: '', email: '', address: '', notes: '', shipping_tariff_id: '', payment_method: undefined });
      setIsCartOpen(false);
      toast.success('¡Orden creada exitosamente!');
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Error al crear la orden');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const submitOrderViaWhatsApp = async () => {
    if (!storeData || cart.length === 0 || !storeData.contact_phone) return;

    setSubmittingOrder(true);
    try {
      const selectedShipping = storeData.shipping_rates?.find(r => r.id === orderData.shipping_tariff_id);
      const paymentText = orderData.payment_method === 'cash_on_delivery' ? 'Contra entrega' : 'Transferencia';

      const productsPayload = cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      const { data, error } = await supabase.functions.invoke('create-order-from-agent', {
        body: {
          customer_name: orderData.name,
          customer_last_name: '',
          customer_address: orderData.address,
          customer_phone: orderData.phone,
          customer_email: orderData.email,
          products: productsPayload,
          Departamento: '',
          ciudad: '',
          forma_de_pago: paymentText,
          user_id: storeData.user_id,
          shipping_tariff: selectedShipping ? { id: selectedShipping.id, name: selectedShipping.name } : orderData.shipping_tariff_id,
          order_source: 'store',
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || 'Edge function failed');
      }

      // WhatsApp notification to store
      const orderSummary = cart
        .map(item => `${item.quantity}x ${item.product.name} - ${formatPrice(item.product.price * item.quantity)}`)
        .join('\n');
      const shippingInfo = selectedShipping ? `\n*Envío:* ${selectedShipping.name} - ${formatPrice(getShippingCost())}` : '';
      const message = encodeURIComponent(
        `🛒 *Nueva Orden desde ${storeData.store_name}*\n\n` +
        `*Cliente:* ${orderData.name}\n` +
        `*Teléfono:* ${orderData.phone}\n` +
        `*Email:* ${orderData.email}\n` +
        `*Dirección:* ${orderData.address}\n\n` +
        `*Productos:*\n${orderSummary}\n` +
        `*Subtotal:* ${formatPrice(getSubtotal())}${shippingInfo}\n\n` +
        `*Total:* ${formatPrice(getTotalPrice())}\n\n` +
        `*Notas:* ${orderData.notes || 'Ninguna'}`
      );
      const phone = storeData.contact_phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');

      // Clear cart and state
      setCart([]);
      if (slug) localStorage.removeItem(`cart_${slug}`);
      setOrderData({ name: '', phone: '', email: '', address: '', notes: '', shipping_tariff_id: '', payment_method: undefined });
      setIsCartOpen(false);
      toast.success('¡Orden enviada por WhatsApp!');
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Error al enviar la orden');
    } finally {
      setSubmittingOrder(false);
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-48 w-full mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Tienda no encontrada</h1>
          <p className="text-muted-foreground">La tienda que buscas no existe o no está activa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
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
          .store-border-primary { border-color: var(--store-primary); }
        `}
      </style>

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b shadow-sm"
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {storeData.logo_url ? (
              <img
                src={storeData.logo_url}
                alt={storeData.store_name}
                className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center store-primary-text">
                <StoreIcon className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">{storeData.store_name}</h1>
              {storeData.store_description && (
                <p className="text-xs text-gray-500 hidden sm:block max-w-xs truncate">{storeData.store_description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="store-primary-text hover:bg-primary/5"
              onClick={contactWhatsApp}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>

            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button
                  data-cart-trigger
                  className="relative store-primary-bg text-white hover:opacity-90 transition-opacity rounded-full px-4"
                  style={{ backgroundColor: storeData.primary_color }}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  <span className="font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
                <SheetHeader className="p-6 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 store-primary-text" />
                    Tu Carrito
                  </SheetTitle>
                  <SheetDescription>
                    Revisa los productos antes de confirmar tu pedido
                  </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 p-6">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mb-3 opacity-20" />
                      <p>Tu carrito está vacío</p>
                      <Button
                        variant="link"
                        className="store-primary-text"
                        onClick={() => setIsCartOpen(false)}
                      >
                        Ver productos
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        {cart.map(item => (
                          <motion.div
                            layout
                            key={item.product.id}
                            className="flex gap-4 bg-card p-3 rounded-lg border shadow-sm"
                          >
                            <div className="h-20 w-20 rounded-md overflow-hidden bg-muted shrink-0">
                              {item.product.images?.[0] ? (
                                <img
                                  src={getImageUrl(item.product.images[0])}
                                  alt={item.product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gray-100">
                                  <Package className="h-8 w-8 text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <h4 className="font-medium text-sm line-clamp-1">{item.product.name}</h4>
                                {(item.product as any).selectedOptions && Object.values((item.product as any).selectedOptions).some(v => v) && (
                                  <p className="text-xs text-muted-foreground">
                                    {Object.entries((item.product as any).selectedOptions)
                                      .filter(([_, value]) => value)
                                      .map(([_, value]) => value)
                                      .join(' • ')}
                                  </p>
                                )}
                                <p className="text-sm font-semibold store-primary-text">
                                  {formatPrice((item.product as any).currentPrice || item.product.price)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.product.id, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.product.id, 1)}
                                  disabled={item.quantity >= item.product.stock}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="font-medium">Datos de Envío</h3>
                        <div className="grid gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="name" className="text-xs">Nombre completo *</Label>
                            <Input
                              id="name"
                              value={orderData.name}
                              onChange={(e) => setOrderData(prev => ({ ...prev, name: e.target.value }))}
                              className="h-9"
                              placeholder="Tu nombre"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="phone" className="text-xs">Teléfono *</Label>
                              <Input
                                id="phone"
                                value={orderData.phone}
                                onChange={(e) => setOrderData(prev => ({ ...prev, phone: e.target.value }))}
                                className="h-9"
                                placeholder="Tu celular"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="email" className="text-xs">Email</Label>
                              <Input
                                id="email"
                                type="email"
                                value={orderData.email}
                                onChange={(e) => setOrderData(prev => ({ ...prev, email: e.target.value }))}
                                className="h-9"
                                placeholder="correo@ejemplo.com"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="address" className="text-xs">Dirección de entrega *</Label>
                            <Input
                              id="address"
                              value={orderData.address}
                              onChange={(e) => setOrderData(prev => ({ ...prev, address: e.target.value }))}
                              className="h-9"
                              placeholder="Calle, número, barrio, ciudad"
                            />
                          </div>

                          {storeData.shipping_rates && storeData.shipping_rates.length > 0 && (
                            <div className="space-y-1">
                              <Label className="text-xs">Método de envío</Label>
                              <Select
                                value={orderData.shipping_tariff_id}
                                onValueChange={(value) => setOrderData(prev => ({ ...prev, shipping_tariff_id: value }))}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Selecciona envío" />
                                </SelectTrigger>
                                <SelectContent>
                                  {storeData.shipping_rates.map(rate => (
                                    <SelectItem key={rate.id} value={rate.id}>
                                      {rate.name} - {formatPrice(rate.price)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-1">
                            <Label className="text-xs">Método de pago</Label>
                            <Select
                              value={orderData.payment_method}
                              onValueChange={(value: 'cash_on_delivery' | 'bank_transfer') => setOrderData(prev => ({ ...prev, payment_method: value }))}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Selecciona pago" />
                              </SelectTrigger>
                              <SelectContent>
                                {storeData.payment_methods?.cash_on_delivery && (
                                  <SelectItem value="cash_on_delivery">Pago Contra Entrega</SelectItem>
                                )}
                                {storeData.payment_methods?.bank_transfer && (
                                  <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="notes" className="text-xs">Notas adicionales</Label>
                            <Textarea
                              id="notes"
                              value={orderData.notes}
                              onChange={(e) => setOrderData(prev => ({ ...prev, notes: e.target.value }))}
                              className="h-16 resize-none"
                              placeholder="Instrucciones especiales..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </ScrollArea>

                {cart.length > 0 && (
                  <div className="p-6 border-t bg-gray-50">
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(getSubtotal())}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Envío</span>
                        <span>{formatPrice(getShippingCost())}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="store-primary-text">{formatPrice(getTotalPrice())}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button
                        className="w-full store-primary-bg text-white hover:opacity-90"
                        style={{ backgroundColor: storeData.primary_color }}
                        onClick={submitOrderDirectly}
                        disabled={submittingOrder || !orderData.name || !orderData.phone || !orderData.address || !orderData.payment_method}
                      >
                        {submittingOrder ? 'Procesando...' : 'Crear Orden'}
                      </Button>
                      {storeData.contact_phone && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={submitOrderViaWhatsApp}
                          disabled={submittingOrder || !orderData.name || !orderData.phone || !orderData.address || !orderData.payment_method}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {submittingOrder ? 'Enviando...' : 'Enviar por WhatsApp'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.header>

      {/* Banner */}
      {storeData.banner_url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full h-48 md:h-64 lg:h-80 relative overflow-hidden"
        >
          <img
            src={storeData.banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6 md:p-10">
            <div className="text-white">
              <h2 className="text-2xl md:text-4xl font-bold mb-2">{storeData.store_name}</h2>
              <p className="text-white/90 max-w-2xl">{storeData.store_description}</p>
            </div>
          </div>
        </motion.div>
      )}

      <main className="container mx-auto px-4 py-8">
        {/* Categories */}
        <div className="mb-8 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              className={`rounded-full px-6 ${selectedCategory === 'all' ? 'store-primary-bg text-white border-transparent' : 'hover:bg-gray-50'}`}
              style={selectedCategory === 'all' ? { backgroundColor: storeData.primary_color } : {}}
              onClick={() => setSelectedCategory('all')}
            >
              Todos
            </Button>
            {categories.slice(1).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className={`rounded-full px-6 uppercase ${selectedCategory === category ? 'store-primary-bg text-white border-transparent' : 'hover:bg-gray-50'}`}
                style={selectedCategory === category ? { backgroundColor: storeData.primary_color } : {}}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={product.id}
              >
                <Card
                  className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-100 h-full flex flex-col cursor-pointer"
                  onClick={() => navigate(`/store/${slug}/product/${product.id}`)}
                >
                  <div className="aspect-square relative overflow-hidden bg-gray-100">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={getImageUrl(product.images[0])}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}

                    {product.stock <= 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <Badge variant="destructive" className="text-sm font-medium px-3 py-1">Agotado</Badge>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/60 to-transparent pt-10">
                      <Button
                        className="w-full store-primary-bg text-white shadow-lg"
                        style={{ backgroundColor: storeData.primary_color }}
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        disabled={product.stock <= 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar
                      </Button>
                    </div>
                  </div>

                   <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="mb-2">
                      <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:store-primary-text transition-colors">
                        {product.name}
                      </h3>
                    </div>
                    <div className="mt-auto">
                      <span className="text-lg font-bold store-primary-text">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No se encontraron productos</h3>
            <p className="text-gray-500">
              {selectedCategory === 'all'
                ? 'Esta tienda aún no tiene productos disponibles.'
                : `No hay productos en la categoría "${selectedCategory}".`
              }
            </p>
          </div>
        )}
      </main>

      {/* Floating WhatsApp Button */}
      {storeData.show_whatsapp_button && storeData.whatsapp_number && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            size="lg"
            className="rounded-full h-16 w-16 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110"
            style={{ backgroundColor: '#25D366' }}
            onClick={() => {
              const phone = storeData.whatsapp_number.replace(/\D/g, '');
              const message = `Hola! Me interesa conocer más sobre los productos de ${storeData.store_name}. ¿Podrían ayudarme?`;
              const url = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
              window.open(url, '_blank');
            }}
          >
            <MessageCircle className="h-8 w-8 text-white" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default PublicStore;