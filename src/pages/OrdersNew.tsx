import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, MessageCircle, Plus, Search, Filter, Trash2, Package, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreateOrderForm } from '@/components/orders/CreateOrderForm';
import { OrderDetailsDialog } from '@/components/orders/OrderDetailsDialog';

import { Order, Customer, OrderItem } from '@/types/order';

const getOrderSource = (order: Order) => {
  console.log('getOrderSource debug:', {
    id: order.id.slice(0, 8),
    source: order.source,
    order_source: order.order_source,
    notes: order.notes?.includes('AI Agent') ? 'Has AI Agent in notes' : 'No AI Agent in notes'
  });
  
  if (order.source === 'shopify') return 'Shopify';
  if (order.order_source === 'agent') return 'Agente IA';
  if (order.order_source === 'manual') return 'Manual';
  
  // Fallback: check notes for AI Agent indication
  if (order.notes && (
    order.notes.includes('AI Agent') || 
    order.notes.includes('Pedido generado automáticamente') ||
    order.notes.includes('IA Agent')
  )) {
    return 'Agente IA';
  }
  
  return 'Manual'; // Default fallback
};

export default function OrdersNew() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  console.log('Orders component rendered', { ordersCount: orders.length, loading });

  useEffect(() => {
    // Check if user is authenticated
    const checkAuthAndFetch = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          throw authError;
        }
        
        if (!user) {
          console.error('No user found');
          toast({
            title: "Error de autenticación",
            description: "Por favor, inicia sesión nuevamente",
            variant: "destructive"
          });
          return;
        }
        
        console.log('User authenticated:', user.id);
        await fetchOrders();
        
      } catch (error) {
        console.error('Auth check failed:', error);
        setLoading(false);
      }
    };
    
    checkAuthAndFetch();
  }, []);

  const fetchOrders = async () => {
    try {
      console.log('Fetching orders...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      console.log('Fetching orders for user:', user.id);
      
      // Fetch orders with all related data in one query
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers (
            id, name, last_name, phone, email, address, city, province
          ),
          order_items (
            id, quantity, price,
            product:products (
              id, name, images
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Orders fetched:', data?.length || 0);
      console.log('Sample order with data:', data?.[0]);
      
      // Debug order data
      data?.forEach((order, index) => {
        console.log(`Order ${index + 1}:`, {
          id: order.id.slice(0, 8),
          customer: order.customer?.name || 'No customer',
          items: order.order_items?.length || 0,
          source: order.order_source || 'local',
          order_source: order.order_source
        });
      });
      
      // Ensure all orders have a source field and proper structure
      const ordersWithSource = (data || []).map(order => ({
        ...order,
        source: (order.order_source === 'shopify' ? 'shopify' : 'local') as 'local' | 'shopify'
      }));
      
      setOrders(ordersWithSource);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      toast({
        title: "Error",
        description: `No se pudieron cargar los pedidos: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const fixExistingAIOrders = async () => {
    try {
      console.log('Fixing existing AI agent orders...');
      
      // Update orders that have AI Agent in notes but don't have correct order_source
      const { data: updatedOrders, error } = await supabase
        .from('orders')
        .update({ order_source: 'agent' })
        .or('notes.ilike.%AI Agent%,notes.ilike.%Pedido generado automáticamente%')
        .neq('order_source', 'agent')
        .select();

      if (error) {
        console.error('Error fixing AI orders:', error);
      } else {
        console.log('Fixed AI agent orders:', updatedOrders?.length || 0);
        if (updatedOrders && updatedOrders.length > 0) {
          fetchOrders(); // Refresh the list
          toast({
            title: "Éxito",
            description: `Se actualizaron ${updatedOrders.length} pedidos del AI Agent`
          });
        }
      }
    } catch (error) {
      console.error('Error in fixExistingAIOrders:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pendiente': { label: 'Pendiente', variant: 'secondary' as const },
      'procesando': { label: 'Procesando', variant: 'default' as const },
      'enviado': { label: 'Enviado', variant: 'outline' as const },
      'entregado': { label: 'Entregado', variant: 'default' as const },
      'cancelado': { label: 'Cancelado', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendiente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pendiente').length;
  const completedOrders = orders.filter(order => order.status === 'entregado').length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando pedidos...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
            <p className="text-muted-foreground">Gestiona todos los pedidos de tus clientes</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                console.log('Fix AI Orders button clicked!');
                fixExistingAIOrders();
              }}
              className="text-xs"
            >
              🔧 Fix AI Orders
            </Button>
            <CreateOrderForm onOrderCreated={() => {
              console.log('Order created callback triggered');
              fetchOrders();
            }}>
              <Button onClick={() => console.log('Create Order button clicked')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Pedido
              </Button>
            </CreateOrderForm>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pedidos (7 días)</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes (7 días)</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregados (7 días)</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas Total (7 días)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-green-600">+12%</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Listado de Pedidos</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar pedidos..." className="pl-8 w-64" />
                </div>
                <Select defaultValue="todos">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendiente">Pendientes</SelectItem>
                    <SelectItem value="procesando">Procesando</SelectItem>
                    <SelectItem value="enviado">Enviados</SelectItem>
                    <SelectItem value="entregado">Entregados</SelectItem>
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
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      #{order.id.slice(0, 8)}
                      <div className="text-xs text-muted-foreground">Local</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {order.customer 
                          ? `${order.customer.name} ${order.customer.last_name || ''}`.trim()
                          : 'Cliente no disponible'
                        }
                      </div>
                      {order.customer?.phone && (
                        <div className="text-sm text-muted-foreground">{order.customer.phone}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge variant={getOrderSource(order) === 'Agente IA' ? 'default' : getOrderSource(order) === 'Shopify' ? 'secondary' : 'outline'}>
                        {getOrderSource(order)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">Pago Contra Entrega</div>
                      {order.payment_status && (
                        <Badge variant="outline" className="text-xs">
                          {order.payment_status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-sm">{formatDate(order.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageCircle className="h-4 w-4" />
                          Chat
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
          order={selectedOrder as any}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onOrderUpdated={fetchOrders}
      />
    </DashboardLayout>
  );
}
