import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Package, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OrderDetailsDialog } from '@/components/orders/OrderDetailsDialog';
import { Order } from '@/types/order';

interface OrderHistoryProps {
  customerId: string;
}

const statusLabels = {
  pendiente: 'Pendiente',
  preparado: 'Preparado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const statusColors = {
  pendiente: 'default',
  preparado: 'secondary',
  entregado: 'default',
  cancelado: 'destructive',
} as const;

export function OrderHistory({ customerId }: OrderHistoryProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    fetchOrderHistory();
  }, [customerId]);

  const fetchOrderHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          order_items(*, product:products(*))
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []).map(order => ({ ...order, source: 'local' as const })));
    } catch (error) {
      console.error('Error fetching order history:', error);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Historial de Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Historial de Pedidos ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay pedidos registrados para este cliente
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        Pedido #{order.order_number || order.id.slice(-8)}
                      </span>
                      <Badge variant={statusColors[order.status as keyof typeof statusColors] || 'default'}>
                        {statusLabels[order.status as keyof typeof statusLabels] || order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('es-CO')} - {formatPrice(order.total)}
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectedOrder(order)}
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <OrderDetailsDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onOrderUpdated={fetchOrderHistory}
      />
    </>
  );
}