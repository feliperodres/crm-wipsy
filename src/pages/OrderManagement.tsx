import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Package, Search, Eye, Plus, TrendingUp, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/utils';
import { OrderDetailsDialog } from '@/components/orders/OrderDetailsDialog';

import { Order, OrderItem } from '@/types/order';

// Function to map Shopify status to our internal status
const mapShopifyStatusToLocal = (financialStatus: string, fulfillmentStatus: string): string => {
  if (fulfillmentStatus) {
    switch (fulfillmentStatus) {
      case 'fulfilled':
        return 'entregado';
      case 'partial':
        return 'preparado';
      case 'unfulfilled':
      case null:
        if (financialStatus === 'paid') {
          return 'pendiente';
        }
        return 'pendiente';
      default:
        return 'pendiente';
    }
  }
  
  switch (financialStatus) {
    case 'paid':
      return 'pendiente';
    case 'pending':
      return 'pendiente';
    case 'refunded':
    case 'voided':
      return 'cancelado';
    default:
      return 'pendiente';
  }
};

const OrderManagement = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    delivered: 0,
    totalSales: 0
  });

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    filterOrders();
    calculateStats();
  }, [orders, searchTerm, statusFilter]);

  const fetchOrders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch local orders
      const { data: localOrders, error: localError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name, phone, email, address),
          order_items(
            id,
            quantity,
            price,
            product:products(id, name, images)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (localError) throw localError;

      // Fetch Shopify orders
      const { data: shopifyOrders, error: shopifyError } = await supabase
        .from('shopify_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (shopifyError) throw shopifyError;

      // Format local orders
      const formattedLocalOrders: any[] = (localOrders || []).map(order => ({
        ...order,
        source: 'local' as const,
        order_items: order.order_items.map(item => ({
          ...item,
          product: {
            ...item.product,
            images: Array.isArray(item.product.images) 
              ? item.product.images.filter(img => typeof img === 'string') 
              : []
          }
        }))
      }));

      // Format Shopify orders with correct status mapping
      const formattedShopifyOrders: any[] = (shopifyOrders || []).map(order => {
        const mappedStatus = mapShopifyStatusToLocal(order.financial_status, order.fulfillment_status);
        
        return {
          id: order.id,
          total: Number(order.total_price || 0),
          status: mappedStatus,
          created_at: order.created_at || '',
          order_number: order.order_number,
          email: order.email,
          source: 'shopify' as const,
          customer_data: order.customer_data,
          line_items: order.line_items
        };
      });

      // Combine orders
      const allOrders = [...formattedLocalOrders, ...formattedShopifyOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(allOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentOrders = orders.filter(order => 
      new Date(order.created_at) >= sevenDaysAgo
    );
    
    const total = recentOrders.length;
    const pending = recentOrders.filter(order => order.status === 'pendiente').length;
    const delivered = recentOrders.filter(order => order.status === 'entregado').length;
    const totalSales = recentOrders.reduce((sum, order) => sum + order.total, 0);

    setStats({
      total,
      pending,
      delivered,
      totalSales
    });
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order => {
        const customerName = getCustomerName(order);
        const customerPhone = getCustomerPhone(order);
        return (
          customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customerPhone.includes(searchTerm) ||
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (order.order_number && order.order_number.includes(searchTerm))
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Show 100 orders per page
    const paginatedOrders = filtered.slice(0, 100);
    setFilteredOrders(paginatedOrders);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getCustomerName = (order: Order) => {
    if (order.source === 'shopify') {
      const customerData = order.customer_data as any;
      return customerData ? `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() : 'Cliente Shopify';
    }
    return order.customer?.name || 'Sin nombre';
  };

  const getCustomerPhone = (order: Order) => {
    if (order.source === 'shopify') {
      const customerData = order.customer_data as any;
      return customerData?.phone || order.email || 'No disponible';
    }
    return order.customer?.phone || 'No disponible';
  };

  const getPaymentMethod = (order: Order) => {
    if (order.source === 'shopify') {
      return 'Transferencia'; // Shopify orders are usually online payments
    }
    const paymentMethod = order.payment_method;
    if (paymentMethod === 'cash' || paymentMethod === 'contra_entrega') {
      return 'Contra Entrega';
    }
    if (paymentMethod === 'transfer' || paymentMethod === 'transferencia') {
      return 'Transferencia';
    }
    return paymentMethod || 'No especificado';
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Estado del pedido actualizado');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('No se pudo actualizar el estado del pedido');
    }
  };

  const confirmPayment = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'confirmed' })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Pago confirmado exitosamente');
      fetchOrders();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('No se pudo confirmar el pago');
    }
  };

  const getOrderSourceBadge = (order: Order) => {
    if (order.source === 'shopify') {
      return (
        <Badge variant="outline" className="text-xs">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
          Shopify
        </Badge>
      );
    }
    
    const sourceConfig = {
      manual: { label: 'Manual', color: 'bg-blue-500' },
      agent: { label: 'Agente IA', color: 'bg-purple-500' },
      store: { label: 'Tienda Online', color: 'bg-orange-500' }
    };
    
    const config = sourceConfig[order.order_source as keyof typeof sourceConfig] || sourceConfig.manual;
    
    return (
      <Badge variant="outline" className="text-xs">
        <span className={`w-2 h-2 ${config.color} rounded-full mr-1`}></span>
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendiente: { label: 'Pendiente', variant: 'secondary' as const },
      preparado: { label: 'Preparado', variant: 'default' as const },
      entregado: { label: 'Entregado', variant: 'default' as const },
      cancelado: { label: 'Cancelado', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendiente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
            <p className="text-muted-foreground">Gestiona todos los pedidos de tus clientes</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Crear Pedido
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Package className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Pedidos (7 días)</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Pendientes (7 días)</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Entregados (7 días)</p>
                  <p className="text-2xl font-bold">{stats.delivered}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Ventas Total (7 días)</p>
                  <p className="text-2xl font-bold">{formatPrice(stats.totalSales)}</p>
                  <div className="flex items-center text-xs text-green-500 mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Listado de Pedidos</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar pedidos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="preparado">Preparado</SelectItem>
                    <SelectItem value="entregado">Entregado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {order.source === 'shopify' && order.order_number ? 
                            `#${order.order_number}` : 
                            `#${order.id.slice(-8)}`
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.source === 'shopify' ? 'Shopify' : 'Local'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getCustomerName(order)}</p>
                        <p className="text-sm text-muted-foreground">{getCustomerPhone(order)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(order.total)}
                    </TableCell>
                    <TableCell>
                      {getOrderSourceBadge(order)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant={getPaymentMethod(order) === 'Contra Entrega' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {getPaymentMethod(order)}
                        </Badge>
                        {order.source === 'local' && 
                         order.order_source === 'agent' && 
                         getPaymentMethod(order) === 'Transferencia' && (
                          <Badge 
                            variant={order.payment_status === 'confirmed' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {order.payment_status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.source === 'local' ? (
                        <Select
                          value={order.status}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="preparado">Preparado</SelectItem>
                            <SelectItem value="entregado">Entregado</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getStatusBadge(order.status)
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                        {order.customer_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.location.href = `/chats?customer=${order.customer_id}`;
                            }}
                          >
                            💬 Chat
                          </Button>
                        )}
                        {order.source === 'local' && 
                         order.order_source === 'agent' && 
                         getPaymentMethod(order) === 'Transferencia' && 
                         order.payment_status === 'pending' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => confirmPayment(order.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            ✓ Confirmar Pago
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron pedidos.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <OrderDetailsDialog
          order={selectedOrder}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onOrderUpdated={fetchOrders}
        />
      </div>
    </DashboardLayout>
  );
};

export default OrderManagement;