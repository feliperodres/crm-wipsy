import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  stock: number;
  category: string;
  is_active: boolean;
}

interface StoreData {
  store_name: string;
  store_description: string;
  logo_url: string;
  banner_url: string;
  primary_color: string;
  accent_color: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  store_slug: string;
  user_id: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const Cart = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoreData();
    loadCartFromStorage();
  }, [slug]);

  const fetchStoreData = async () => {
    if (!slug) return;

    try {
      const { data: storeSettings, error: storeError } = await supabase
        .from('store_settings')
        .select('*')
        .eq('store_slug', slug)
        .eq('is_active', true)
        .single();

      if (storeError || !storeSettings) {
        throw new Error('Tienda no encontrada');
      }

      // If store doesn't have contact phone, try to get it from user profile
      let finalStoreData = storeSettings;
      if (!storeSettings.contact_phone) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('whatsapp_number')
          .eq('user_id', storeSettings.user_id)
          .single();
          
        if (profile?.whatsapp_number) {
          finalStoreData = {
            ...storeSettings,
            contact_phone: profile.whatsapp_number
          };
        }
      }

      setStoreData(finalStoreData);
    } catch (error) {
      console.error('Error fetching store:', error);
      toast.error('Error al cargar la tienda');
      navigate('/landing');
    } finally {
      setLoading(false);
    }
  };

  const loadCartFromStorage = () => {
    const savedCart = localStorage.getItem(`cart_${slug}`);
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  };

  const saveCartToStorage = (items: CartItem[]) => {
    localStorage.setItem(`cart_${slug}`, JSON.stringify(items));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const updatedItems = cartItems.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: Math.max(0, newQuantity) }
        : item
    ).filter(item => item.quantity > 0);
    
    setCartItems(updatedItems);
    saveCartToStorage(updatedItems);
  };

  const removeFromCart = (productId: string) => {
    const updatedItems = cartItems.filter(item => item.product.id !== productId);
    setCartItems(updatedItems);
    saveCartToStorage(updatedItems);
    toast.success('Producto eliminado del carrito');
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const contactWhatsApp = () => {
    if (!storeData?.contact_phone) return;
    
    const itemsList = cartItems.map(item => 
      `- ${item.product.name} (x${item.quantity}) - ${formatPrice(item.product.price * item.quantity)}`
    ).join('\n');
    
    const message = `Hola! Quiero hacer un pedido de ${storeData.store_name}:\n\n${itemsList}\n\nTotal: ${formatPrice(getTotalPrice())}\n\n¿Podrían ayudarme con este pedido?`;
    const cleanPhone = storeData.contact_phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tienda no encontrada</h1>
          <Button onClick={() => navigate('/landing')}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  // Aplicar colores de la tienda
  document.documentElement.style.setProperty('--store-primary', storeData.primary_color);
  document.documentElement.style.setProperty('--store-accent', storeData.accent_color);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/store/${slug}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a la tienda
              </Button>
              {storeData.logo_url && (
                <img 
                  src={storeData.logo_url} 
                  alt={storeData.store_name}
                  className="h-10 w-10 object-contain"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{storeData.store_name}</h1>
                <p className="text-sm text-gray-600">Carrito de compras</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Mi Carrito ({cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'})
          </h2>
        </div>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Tu carrito está vacío</h3>
              <p className="text-gray-600 mb-4">¡Explora nuestros productos y añade algunos al carrito!</p>
              <Button 
                onClick={() => navigate(`/store/${slug}`)}
                style={{ backgroundColor: storeData.primary_color }}
                className="text-white"
              >
                Continuar comprando
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <Card key={item.product.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg">
                      {item.product.images && item.product.images.length > 0 ? (
                        <img
                          src={getImageUrl(item.product.images[0])}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">Sin imagen</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{item.product.name}</h3>
                      <p className="text-sm text-gray-600">{item.product.category}</p>
                      <p className="text-lg font-bold" style={{ color: storeData.primary_color }}>
                        {formatPrice(item.product.price)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-semibold px-2">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.product.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-lg" style={{ color: storeData.primary_color }}>
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Total y botón de pedido */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold" style={{ color: storeData.primary_color }}>
                    {formatPrice(getTotalPrice())}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {storeData.contact_phone ? (
                    <Button
                      onClick={contactWhatsApp}
                      className="w-full text-white font-semibold py-3"
                      style={{ backgroundColor: storeData.primary_color }}
                    >
                      Hacer Pedido por WhatsApp
                    </Button>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-yellow-800 mb-2">
                        ⚠️ La tienda no tiene configurado un número de WhatsApp
                      </p>
                      <p className="text-xs text-yellow-600">
                        Contacta directamente con la tienda para realizar tu pedido
                      </p>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/store/${slug}`)}
                    className="w-full"
                  >
                    Continuar comprando
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;