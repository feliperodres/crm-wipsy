import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Eye, Edit, Calendar, DollarSign, User, Package, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreateOrderForm } from '@/components/orders/CreateOrderForm';

interface Order {
  id: string;
  customer_id?: string;
  total: number;
  status: string;
  notes?: string;
  created_at: string;
  order_number?: string;
  email?: string;
  source: 'local' | 'shopify';
  order_source?: string;
  customers?: {
    name: string;
    phone: string;
    email?: string;
  };
  customer_data?: any;
  order_items?: {
    id: string;
    quantity: number;
    price: number;
    products: {
      name: string;
    };
  }[];
  line_items?: any;
}

const statusColors = {
  pending: 'default',
  pendiente: 'default',
  preparado: 'secondary',
  entregado: 'default',
  cancelado: 'destructive',
  fulfilled: 'default',
  paid: 'secondary',
  partially_paid: 'secondary',
  unfulfilled: 'destructive'
} as const;

const statusLabels = {
  pending: 'Pendiente',
  pendiente: 'Pendiente',
  preparado: 'Preparado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  fulfilled: 'Entregado',
  paid: 'Pagado',
  partially_paid: 'Pago Parcial',
  unfulfilled: 'Sin Procesar'
};

const getOrderSource = (order: Order) => {
  console.log('getOrderSource debug:', {
    id: order.id.slice(0, 8),
    source: order.source,
    order_source: order.order_source,
    notes: order.notes?.includes('AI Agent') ? 'Has AI Agent in notes' : 'No AI Agent in notes'
  });
  
  if (order.source === 'shopify') return 'Shopify';
  if (order.order_source === 'ai_agent') return 'Agente IA';
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

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  console.log('🚀 ORDERS COMPONENT LOADED - NEW VERSION! 🚀', { ordersCount: orders.length, loading });
  
  // Force alert on component load to verify it's working
  React.useEffect(() => {
    console.log('🔥 COMPONENT MOUNTED - CHANGES ARE WORKING! 🔥');
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Function to fix existing AI agent orders
  const fixExistingAIOrders = async () => {
    try {
      console.log('Fixing existing AI agent orders...');
      
      // Update orders that have AI Agent in notes but don't have correct order_source
      const { data: updatedOrders, error } = await supabase
        .from('orders')
        .update({ order_source: 'ai_agent' })
        .or('notes.ilike.%AI Agent%,notes.ilike.%Pedido generado automáticamente%')
        .neq('order_source', 'ai_agent')
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

  const fetchOrders = async () => {
    try {
      // Fetch local orders
      const { data: localOrders, error: localError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            name,
            phone
          ),
          order_items (
            id,
            quantity,
            price,
            products (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (localError) throw localError;

      // Combine and format orders
      const formattedLocalOrders: Order[] = (localOrders || []).map(order => {
        console.log('Order debug:', {
          id: order.id.slice(0, 8),
          order_source: order.order_source,
          notes: order.notes?.slice(0, 50)
        });
        return {
          ...order,
          source: 'local' as const
        };
      });

      // Fetch Shopify orders with customer information
      const { data: shopifyOrders, error: shopifyError } = await supabase
        .from('shopify_orders')
        .select(`
          *,
          customers (
            name,
            phone,
            email
          )
        `)
        .order('created_at', { ascending: false });

      let formattedShopifyOrders: Order[] = [];
      
      if (shopifyError) {
        console.error('Error fetching Shopify orders with customers:', shopifyError);
        // If join fails, fetch without customer join
        const { data: fallbackOrders } = await supabase
          .from('shopify_orders')
          .select('*')
          .order('created_at', { ascending: false });
        
        // Process orders without customer join
        formattedShopifyOrders = (fallbackOrders || []).map(order => ({
          id: order.id,
          total: Number(order.total_price || 0),
          status: order.fulfillment_status || order.financial_status || 'pending',
          created_at: order.created_at || '',
          order_number: order.order_number,
          email: order.email,
          source: 'shopify' as const,
          customer_data: order.customer_data,
          line_items: order.line_items
        }));
      } else {
        // Process orders with customer join
        formattedShopifyOrders = (shopifyOrders || []).map(order => ({
          id: order.id,
          total: Number(order.total_price || 0),
          status: order.fulfillment_status || order.financial_status || 'pending',
          created_at: order.created_at || '',
          order_number: order.order_number,
          email: order.email,
          source: 'shopify' as const,
          customer_data: order.customer_data,
          line_items: order.line_items,
          customers: order.customers // Add the joined customer data
        }));
      }

      const allOrders = [...formattedLocalOrders, ...formattedShopifyOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(allOrders);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Estado del pedido actualizado"
      });

      fetchOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del pedido",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrderTotal = (order: Order) => {
    if (order.source === 'shopify') {
      return order.total;
    }
    const subtotal = order.order_items?.reduce((total, item) => total + (item.quantity * item.price), 0) || 0;
    const shipping = (order as any).shipping_cost || 0;
    return subtotal + shipping;
  };

  const getCustomerName = (order: Order) => {
    if (order.source === 'shopify') {
      // First try the linked customer data from the join
      if (order.customers?.name) {
        return order.customers.name;
      }
      // Fallback to customer_data if join failed
      const customerData = order.customer_data as any;
      return customerData ? `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() : 'Cliente Shopify';
    }
    return order.customers?.name || 'Sin nombre';
  };

  const getCustomerContact = (order: Order) => {
    if (order.source === 'shopify') {
      // First try the linked customer email (more useful than generated phone)
      if (order.customers?.email && !order.customers.email.includes('unknown.com')) {
        return order.customers.email;
      }
      // Check if phone is not a generated value
      if (order.customers?.phone && !order.customers.phone.startsWith('shopify-')) {
        return order.customers.phone;
      }
      // Fallback to customer_data if join failed
      const customerData = order.customer_data as any;
      return customerData?.email || order.email || 'No disponible';
    }
    return order.customers?.phone || 'No disponible';
  };

  const getPaymentMethod = (order: Order) => {
    if (order.source === 'shopify') {
      return 'Transferencia'; // Shopify orders are usually online payments
    }
    const paymentMethod = (order as any).payment_method;
    if (paymentMethod === 'cash' || paymentMethod === 'contra_entrega') {
      return 'Contra Entrega';
    }
    if (paymentMethod === 'transfer' || paymentMethod === 'transferencia') {
      return 'Transferencia';
    }
    return paymentMethod || 'No especificado';
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
      <div style={{backgroundColor: 'red', padding: '20px', margin: '20px', border: '5px solid yellow'}}>
        <h1 style={{color: 'white', fontSize: '30px', textAlign: 'center'}}>🚨 SI VES ESTO, LOS CAMBIOS FUNCIONAN 🚨</h1>
      </div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" style={{backgroundColor: 'yellow', padding: '10px'}}>🔥 PEDIDOS - NUEVA VERSIÓN 🔥</h1>
            <p className="text-muted-foreground" style={{fontSize: '18px', color: 'red'}}>✅ SI VES ESTO, LOS CAMBIOS FUNCIONAN ✅</p>
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
            <Button 
              onClick={() => {
                console.log('TEST: Simple button clicked!');
                alert('Button works!');
              }}
              variant="secondary"
            >
              🧪 Test Button
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
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Pedidos</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold">
                    {orders.filter(order => order.status === 'pendiente').length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Entregados</p>
                  <p className="text-2xl font-bold">
                    {orders.filter(order => order.status === 'entregado').length}
                  </p>
                </div>
                <Package className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ventas Total</p>
                  <p className="text-2xl font-bold">
                    ${orders.reduce((total, order) => total + getOrderTotal(order), 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {orders.map((order) => (
                   <TableRow key={`${order.source}-${order.id}`} className="h-12">
                     <TableCell className="font-mono text-xs py-2">
                       {order.source === 'shopify' && order.order_number ? `#${order.order_number}` : `${order.id.slice(0, 8)}...`}
                       <div className="text-xs text-muted-foreground">
                         {getOrderSource(order)}
                       </div>
                     </TableCell>
                     <TableCell className="py-2">
                       <div>
                         <p className="font-medium text-sm">{getCustomerName(order)}</p>
                         <p className="text-xs text-muted-foreground">{getCustomerContact(order)}</p>
                       </div>
                     </TableCell>
                      <TableCell className="font-semibold text-sm py-2">
                        ${getOrderTotal(order).toFixed(2)}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge 
                          variant={getPaymentMethod(order) === 'Contra Entrega' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {getPaymentMethod(order)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
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
                          <Badge 
                            variant={statusColors[order.status as keyof typeof statusColors] || 'default'}
                            className="text-xs"
                          >
                            {statusLabels[order.status as keyof typeof statusLabels] || order.status}
                          </Badge>
                        )}
                      </TableCell>
                     <TableCell className="text-sm py-2">
                       {formatDate(order.created_at)}
                     </TableCell>
                     <TableCell className="py-2">
                       <Dialog>
                         <DialogTrigger asChild>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setSelectedOrder(order)}
                             className="h-8 px-2 text-xs"
                           >
                             <Eye className="h-3 w-3 mr-1" />
                             Ver
                           </Button>
                         </DialogTrigger>
                         <DialogContent className="max-w-2xl">
                           <DialogHeader>
                             <DialogTitle>Detalles del Pedido</DialogTitle>
                           </DialogHeader>
                           
                           {selectedOrder && (
                             <div className="space-y-6">
                               <div className="grid grid-cols-2 gap-4">
                                 <div>
                                   <h4 className="font-semibold mb-2">Información del Cliente</h4>
                                   <p><strong>Nombre:</strong> {getCustomerName(selectedOrder)}</p>
                                   <p><strong>Contacto:</strong> {getCustomerContact(selectedOrder)}</p>
                                 </div>
                                 <div>
                                   <h4 className="font-semibold mb-2">Información del Pedido</h4>
                                    <p><strong>ID:</strong> {selectedOrder.order_number ? `#${selectedOrder.order_number}` : selectedOrder.id}</p>
                                    <p><strong>Fuente:</strong> {getOrderSource(selectedOrder)}</p>
                                    <p><strong>Fecha:</strong> {formatDate(selectedOrder.created_at)}</p>
                                    {selectedOrder.source === 'local' && (selectedOrder as any).shipping_tariff_id && (
                                      <p><strong>Envío:</strong> {(selectedOrder as any).shipping_tariff_id} - ${((selectedOrder as any).shipping_cost || 0).toFixed(2)}</p>
                                    )}
                                   <div className="flex items-center gap-2">
                                     <strong>Estado:</strong>
                                     <Badge variant={statusColors[selectedOrder.status as keyof typeof statusColors] || 'default'}>
                                       {statusLabels[selectedOrder.status as keyof typeof statusLabels] || selectedOrder.status}
                                     </Badge>
                                   </div>
                                 </div>
                               </div>

                               <div>
                                 <h4 className="font-semibold mb-3">Productos</h4>
                                 {selectedOrder.source === 'shopify' ? (
                                   <div className="space-y-2">
                                     {selectedOrder.line_items?.map((item: any, index: number) => (
                                       <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                         <div>
                                           <p className="font-medium">{item.title}</p>
                                           <p className="text-sm text-muted-foreground">Cantidad: {item.quantity}</p>
                                         </div>
                                         <div className="text-right">
                                           <p className="font-semibold">${Number(item.price).toFixed(2)}</p>
                                           <p className="text-sm text-muted-foreground">
                                             Total: ${(Number(item.price) * item.quantity).toFixed(2)}
                                           </p>
                                         </div>
                                       </div>
                                     ))}
                                   </div>
                                 ) : (
                                   <Table>
                                     <TableHeader>
                                       <TableRow>
                                         <TableHead>Producto</TableHead>
                                         <TableHead>Cantidad</TableHead>
                                         <TableHead>Precio</TableHead>
                                         <TableHead>Subtotal</TableHead>
                                       </TableRow>
                                     </TableHeader>
                                     <TableBody>
                                       {selectedOrder.order_items?.map((item) => (
                                         <TableRow key={item.id}>
                                           <TableCell>{item.products.name}</TableCell>
                                           <TableCell>{item.quantity}</TableCell>
                                           <TableCell>${item.price.toFixed(2)}</TableCell>
                                           <TableCell>${(item.quantity * item.price).toFixed(2)}</TableCell>
                                         </TableRow>
                                       ))}
                                     </TableBody>
                                   </Table>
                                 )}
                                 
                                 <div className="text-right mt-4">
                                   <p className="text-lg font-bold">
                                     Total: ${getOrderTotal(selectedOrder).toFixed(2)}
                                   </p>
                                 </div>
                               </div>

                               {selectedOrder.notes && (
                                 <div>
                                   <h4 className="font-semibold mb-2">Notas</h4>
                                   <p className="text-muted-foreground">{selectedOrder.notes}</p>
                                 </div>
                               )}
                             </div>
                           )}
                         </DialogContent>
                       </Dialog>
                     </TableCell>
                   </TableRow>
                 ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No hay pedidos
            </h3>
            <p className="text-muted-foreground">
              Los pedidos aparecerán aquí cuando los clientes realicen compras
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}