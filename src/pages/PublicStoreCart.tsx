import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, MapPin, Package, ShoppingCart, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: any[];
  stock: number;
  category: string;
  is_active: boolean;
}

interface ShippingRate {
  id: string;
  name: string;
  price: number;
  condition_type: 'none' | 'minimum_order' | 'weight_based';
  condition_value?: number;
  description?: string;
}

interface PaymentMethods {
  cash_on_delivery: boolean;
  bank_transfer: boolean;
  instructions: string;
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
  shipping_rate_id?: string;
  payment_method?: 'cash_on_delivery' | 'bank_transfer';
}

const PublicStoreCart = () => {
  const { slug } = useParams<{ slug: string }>();
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderData, setOrderData] = useState<OrderData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    shipping_rate_id: '',
    payment_method: undefined
  });
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cargar data al cambiar el slug
  useEffect(() => {
    if (slug) {
      fetchStoreData();
    }
  }, [slug]);

  // Logs de debug cuando hay storeData
  useEffect(() => {
    if (storeData) {
      console.log('Store data loaded:', storeData);
      console.log('Shipping rates:', storeData.shipping_rates);
      console.log('Payment methods:', storeData.payment_methods);
    }
  }, [storeData]);

  const fetchStoreData = async () => {
    if (!slug) return;

    try {
      // Fetch store settings
      const { data: storeSettings, error: storeError } = await supabase
        .from('store_settings')
        .select('*')
        .eq('store_slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (storeError) throw storeError;
      if (!storeSettings) return;

      const storeDataWithDefaults = {
        ...storeSettings,
        shipping_rates: (() => {
          const raw = storeSettings.shipping_rates as any;
          try {
            if (Array.isArray(raw)) return raw as unknown as ShippingRate[];
            if (typeof raw === 'string') return JSON.parse(raw) as ShippingRate[];
            if (raw && typeof raw === 'object' && 'rates' in raw) return (raw.rates || []) as ShippingRate[];
            return [] as ShippingRate[];
          } catch {
            return [] as ShippingRate[];
          }
        })(),
        payment_methods: (() => {
          const raw = storeSettings.payment_methods as any;
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
        })()
      };
      
      setStoreData(storeDataWithDefaults);

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', storeSettings.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setProducts((productsData || []).map(product => ({
        ...product,
        images: Array.isArray(product.images) ? product.images : []
      })));
    } catch (error) {
      console.error('Error fetching store data:', error);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} agregado al carrito`);
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(prev => 
      prev.map(item => {
        if (item.product.id === productId) {
          const newQuantity = Math.max(0, Math.min(item.quantity + change, item.product.stock));
          return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const getTotalPrice = () => {
    const subtotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    const shippingCost = getShippingCost();
    return subtotal + shippingCost;
  };

  const getShippingCost = () => {
    if (!orderData.shipping_rate_id || !storeData?.shipping_rates) return 0;
    const selectedRate = storeData.shipping_rates.find(rate => rate.id === orderData.shipping_rate_id);
    return selectedRate ? selectedRate.price : 0;
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const submitOrder = async () => {
    if (!storeData || cart.length === 0) return;

    setSubmittingOrder(true);
    try {
      // Create customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: orderData.name,
          phone: orderData.phone,
          email: orderData.email,
          address: orderData.address,
          user_id: storeData.user_id
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customer.id,
          user_id: storeData.user_id,
          total: getTotalPrice(),
          notes: orderData.notes,
          status: 'pendiente',
          order_source: 'store',
          shipping_tariff_id: orderData.shipping_rate_id,
          shipping_cost: getShippingCost(),
          payment_method: orderData.payment_method
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Send WhatsApp message if phone is available
      if (storeData.contact_phone) {
        const orderSummary = cart.map(item => 
          `${item.quantity}x ${item.product.name} - $${(item.product.price * item.quantity).toLocaleString()}`
        ).join('\n');
        
        const selectedShipping = orderData.shipping_rate_id ? 
          storeData.shipping_rates?.find(rate => rate.id === orderData.shipping_rate_id) : null;
        
        const paymentMethodText = orderData.payment_method === 'cash_on_delivery' ? 
          'Pago contra entrega' : 
          orderData.payment_method === 'bank_transfer' ? 
          'Transferencia bancaria' : 'No especificado';
        
        const message = encodeURIComponent(
          `🛒 *Nueva Orden desde ${storeData.store_name}*\n\n` +
          `*Cliente:* ${orderData.name}\n` +
          `*Teléfono:* ${orderData.phone}\n` +
          `*Email:* ${orderData.email}\n` +
          `*Dirección:* ${orderData.address}\n\n` +
          `*Productos:*\n${orderSummary}\n\n` +
          `*Subtotal:* $${getSubtotal().toLocaleString()}\n` +
          (selectedShipping ? `*Envío:* ${selectedShipping.name} - $${selectedShipping.price.toLocaleString()}\n` : '') +
          `*Total:* $${getTotalPrice().toLocaleString()}\n\n` +
          `*Método de pago:* ${paymentMethodText}\n\n` +
          `*Notas:* ${orderData.notes || 'Ninguna'}`
        );
        
        const phone = storeData.contact_phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
      }

      setCart([]);
      setOrderData({ 
        name: '', 
        phone: '', 
        email: '', 
        address: '', 
        notes: '',
        shipping_rate_id: '',
        payment_method: undefined
      });
      setIsOrderDialogOpen(false);
      toast.success('¡Orden enviada exitosamente!');
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Error al enviar la orden');
    } finally {
      setSubmittingOrder(false);
    }
  };

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

  if (!storeData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Tienda no encontrada</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <style>
        {`
          :root {
            --store-primary: ${storeData.primary_color};
            --store-accent: ${storeData.accent_color};
          }
          .store-primary-bg { background-color: var(--store-primary); }
          .store-primary-text { color: var(--store-primary); }
        `}
      </style>

      {/* Fixed Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
            <DialogTrigger asChild>
              <Button className="store-primary-bg hover:opacity-90 rounded-full h-14 w-14">
                <ShoppingCart className="h-6 w-6" />
                <Badge className="absolute -top-2 -right-2 bg-red-500">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tu Carrito</DialogTitle>
                <DialogDescription>
                  Revisa tu pedido y completa tus datos
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-3 p-2 border rounded">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(item.product.price)} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Form */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input
                      id="name"
                      value={orderData.name}
                      onChange={(e) => setOrderData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      value={orderData.phone}
                      onChange={(e) => setOrderData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={orderData.email}
                      onChange={(e) => setOrderData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección de entrega *</Label>
                    <Input
                      id="address"
                      value={orderData.address}
                      onChange={(e) => setOrderData(prev => ({ ...prev, address: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Shipping Rate Selection */}
                  {storeData.shipping_rates && storeData.shipping_rates.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="shipping">Método de envío *</Label>
                      <Select 
                        value={orderData.shipping_rate_id} 
                        onValueChange={(value) => setOrderData(prev => ({ ...prev, shipping_rate_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona método de envío" />
                        </SelectTrigger>
                        <SelectContent>
                          {storeData.shipping_rates.map((rate) => (
                            <SelectItem key={rate.id} value={rate.id}>
                              <div className="flex justify-between w-full">
                                <span>{rate.name}</span>
                                <span className="ml-2">{formatPrice(rate.price)}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Payment Method Selection */}
                  {(storeData.payment_methods?.cash_on_delivery || storeData.payment_methods?.bank_transfer) && (
                    <div className="space-y-2">
                      <Label htmlFor="payment">Método de pago *</Label>
                      <Select 
                        value={orderData.payment_method} 
                        onValueChange={(value: 'cash_on_delivery' | 'bank_transfer') => setOrderData(prev => ({ ...prev, payment_method: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona método de pago" />
                        </SelectTrigger>
                        <SelectContent>
                          {storeData.payment_methods?.cash_on_delivery && (
                            <SelectItem value="cash_on_delivery">
                              Pago contra entrega
                            </SelectItem>
                          )}
                          {storeData.payment_methods?.bank_transfer && (
                            <SelectItem value="bank_transfer">
                              Transferencia bancaria
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {storeData.payment_methods?.instructions && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {storeData.payment_methods.instructions}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas adicionales</Label>
                    <Textarea
                      id="notes"
                      value={orderData.notes}
                      onChange={(e) => setOrderData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </div>

                {/* Total and Submit */}
                <div className="pt-4 border-t">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span>Subtotal:</span>
                      <span>{formatPrice(getSubtotal())}</span>
                    </div>
                    {getShippingCost() > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Envío:</span>
                        <span>{formatPrice(getShippingCost())}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-semibold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{formatPrice(getTotalPrice())}</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={submitOrder}
                    disabled={
                      submittingOrder || 
                      !orderData.name || 
                      !orderData.phone || 
                      !orderData.address ||
                      (storeData.shipping_rates && storeData.shipping_rates.length > 0 && !orderData.shipping_rate_id) ||
                      ((storeData.payment_methods?.cash_on_delivery || storeData.payment_methods?.bank_transfer) && !orderData.payment_method)
                    }
                    className="w-full store-primary-bg hover:opacity-90"
                  >
                    {submittingOrder ? 'Enviando...' : 'Enviar Pedido'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Header */}
      <header className="store-primary-bg text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {storeData.logo_url && (
              <img 
                src={storeData.logo_url} 
                alt={storeData.store_name}
                className="w-20 h-20 object-contain bg-white rounded-full p-2"
              />
            )}
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{storeData.store_name}</h1>
              {storeData.store_description && (
                <p className="text-lg opacity-90">{storeData.store_description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Banner */}
      {storeData.banner_url && (
        <div className="h-64 bg-cover bg-center" style={{ backgroundImage: `url(${storeData.banner_url})` }} />
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Contact Info */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Información de Contacto</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {storeData.contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 store-primary-text" />
                  <div>
                    <p className="font-medium">Teléfono</p>
                    <p className="text-sm text-muted-foreground">{storeData.contact_phone}</p>
                  </div>
                </div>
              )}
              {storeData.contact_email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 store-primary-text" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{storeData.contact_email}</p>
                  </div>
                </div>
              )}
              {storeData.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 store-primary-text" />
                  <div>
                    <p className="font-medium">Dirección</p>
                    <p className="text-sm text-muted-foreground">{storeData.address}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Filter */}
        {categories.length > 2 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className={`cursor-pointer ${
                    selectedCategory === category ? 'store-primary-bg' : ''
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === 'all' ? 'Todos' : category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-muted relative">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={getImageUrl(product.images[0])}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                {product.stock <= 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="destructive">Agotado</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xl font-bold store-primary-text">
                    {formatPrice(product.price)}
                  </p>
                  {product.stock > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Stock: {product.stock}
                    </Badge>
                  )}
                </div>
                
                <Button
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className="w-full store-primary-bg hover:opacity-90"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar al Carrito
                </Button>
                
                {product.category && (
                  <Badge variant="secondary" className="mt-2">
                    {product.category}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay productos disponibles</h3>
            <p className="text-muted-foreground">
              {selectedCategory === 'all' 
                ? 'Esta tienda aún no tiene productos publicados.'
                : `No hay productos en la categoría "${selectedCategory}".`
              }
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-muted mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            © 2024 {storeData.store_name}. Powered by Wafy.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicStoreCart;