import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ProductCard } from '@/components/dashboard/ProductCard';
import { RecentChats } from '@/components/dashboard/RecentChats';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShoppingBag, 
  MessageCircle, 
  DollarSign, 
  TrendingUp,
  Plus,
  Bot
} from 'lucide-react';
import { OnboardingHelpButton } from '@/components/onboarding/OnboardingButton';

interface Product {
  id: string;
  name: string;
  price: number;
  images: any[];
  description: string;
  category: string;
  stock: number;
}

interface DashboardStats {
  totalSales: number;
  activeChats: number;
  productsCount: number;
  conversionRate: number;
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    activeChats: 0,
    productsCount: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch recent products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (productsError) throw productsError;

      // Transform products data
      const transformedProducts: Product[] = (productsData || []).map(product => ({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        images: Array.isArray(product.images) ? product.images : [],
        description: product.description || '',
        category: product.category || '',
        stock: product.stock || 0
      }));

      setProducts(transformedProducts);

      // Fetch stats
      const [
        { count: productsCount },
        { count: chatsCount },
        { data: ordersData }
      ] = await Promise.all([
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('chats')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active'),
        supabase
          .from('orders')
          .select('total, created_at')
          .eq('user_id', user.id)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ]);

      // Calculate total sales for current month
      const totalSales = (ordersData || []).reduce((sum, order) => sum + Number(order.total || 0), 0);

      setStats({
        totalSales,
        activeChats: chatsCount || 0,
        productsCount: productsCount || 0,
        conversionRate: chatsCount > 0 ? Math.round((ordersData?.length || 0) / chatsCount * 100) : 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Panel de Control</h1>
            <p className="text-muted-foreground">Gestiona tu negocio de ventas por WhatsApp</p>
          </div>
          <div className="flex gap-3">
            <OnboardingHelpButton />
            <Button variant="outline" onClick={() => navigate('/ai-agent')}>
              <Bot className="h-4 w-4 mr-2" />
              Configurar IA
            </Button>
            <Button 
              className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary shadow-elegant"
              onClick={() => navigate('/products')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Producto
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Ventas Totales"
            value={formatCurrency(stats.totalSales)}
            description="Este mes"
            icon={DollarSign}
            trend={{ value: "+12%", isPositive: true }}
          />
          <StatsCard
            title="Chats Activos"
            value={stats.activeChats.toString()}
            description="Clientes en línea"
            icon={MessageCircle}
            trend={{ value: "+3", isPositive: true }}
          />
          <StatsCard
            title="Productos"
            value={stats.productsCount.toString()}
            description="En catálogo"
            icon={ShoppingBag}
            trend={{ value: "+8", isPositive: true }}
          />
          <StatsCard
            title="Tasa de Conversión"
            value={`${stats.conversionRate}%`}
            description="Chat a pedido"
            icon={TrendingUp}
            trend={{ value: "+5%", isPositive: true }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Products */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Productos Recientes</h2>
              <Button variant="outline" size="sm">Ver Todo</Button>
            </div>
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={{
                      ...product,
                      image: product.images && product.images.length > 0 
                        ? product.images[0].url || product.images[0]
                        : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop'
                    }} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aún no hay productos. ¡Agrega tu primer producto para comenzar!</p>
              </div>
            )}
          </div>

          {/* Recent Chats */}
          <div>
            <RecentChats />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
