import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit2, Save, X, Trash2, Plus, Package, Truck, CreditCard, User, Calendar, MapPin, Phone, Mail, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/utils';

interface ProductVariant {
  id: string;
  title: string;
  option1?: string;
  option2?: string;
  option3?: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    images: string[];
  };
}

interface ShippingTariff {
  id: string;
  name: string;
  price: number;
  estimated_days: number;
}

interface Customer {
  id: string;
  name: string;
  last_name?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
}

interface Order {
  id: string;
  customer_id?: string;
  total: number;
  status: string;
  notes?: string;
  payment_method?: string;
  payment_status?: string;
  order_source?: string;
  created_at: string;
  updated_at?: string;
  order_number?: string;
  email?: string;
  source: 'local' | 'shopify';
  shipping_cost?: number;
  shipping_tariff_id?: string;
  tracking_number?: string;
  customer?: Customer;
  customer_data?: any;
  order_items?: OrderItem[];
  line_items?: any;
  shipping_tariff?: ShippingTariff;
}

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderUpdated: () => void;
}

const statusLabels = {
  pendiente: 'Pendiente',
  preparado: 'Preparado',
  en_camino: 'En Camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const statusColors = {
  pendiente: 'default',
  preparado: 'secondary',
  en_camino: 'default',
  entregado: 'default',
  cancelado: 'destructive',
} as const;

const statusIcons = {
  pendiente: AlertTriangle,
  preparado: Package,
  en_camino: Truck,
  entregado: CheckCircle,
  cancelado: X,
};

const paymentStatusLabels = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  failed: 'Fallido',
};

const paymentStatusColors = {
  pending: 'destructive',
  confirmed: 'default',
  failed: 'destructive',
} as const;

export function OrderDetailsDialog({ order, open, onOpenChange, onOrderUpdated }: OrderDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<Order>>({});
  const [editingItems, setEditingItems] = useState<OrderItem[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newProductQuantity, setNewProductQuantity] = useState(1);

  useEffect(() => {
    fetchAvailableProducts();
  }, []);

  const fetchAvailableProducts = async () => {
    try {
      // Get current user to filter products
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when fetching products');
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, images')
        .eq('user_id', user.id)  // Filter by current user
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      console.log(`Fetched ${data?.length || 0} products for user ${user.id}`);
      setAvailableProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  if (!order) return null;

  const handleEdit = () => {
    setEditingOrder({
      status: order.status,
      notes: order.notes || '',
      payment_method: order.payment_method || '',
      tracking_number: order.tracking_number || '',
    });
    setEditingItems(order.order_items || []);
    setIsEditing(true);
  };

  const handleCancelOrder = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelado',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Pedido cancelado exitosamente');
      onOrderUpdated();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Error al cancelar el pedido');
    }
  };

  const handleMarkAsDelivered = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'entregado',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Pedido marcado como entregado');
      onOrderUpdated();
    } catch (error) {
      console.error('Error marking order as delivered:', error);
      toast.error('Error al marcar como entregado');
    }
  };

  const handleSave = async () => {
    if (order.source === 'shopify') {
      toast.error('No se pueden editar pedidos de Shopify');
      return;
    }

    try {
      // Calculate new total first (items + shipping)
      const itemsTotal = editingItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const shippingCost = (order as any).shipping_cost || 0;
      const newTotal = itemsTotal + shippingCost;
      
      // Update order details including total
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: editingOrder.status,
          notes: editingOrder.notes,
          payment_method: editingOrder.payment_method,
          tracking_number: editingOrder.tracking_number,
          total: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Handle order items - update existing, insert new, delete removed
      const originalItems = order.order_items || [];
      const currentItemIds = editingItems.map(item => item.id);
      const originalItemIds = originalItems.map(item => item.id);

      // Delete removed items
      const itemsToDelete = originalItemIds.filter(id => !currentItemIds.includes(id));
      for (const itemId of itemsToDelete) {
        const { error } = await supabase
          .from('order_items')
          .delete()
          .eq('id', itemId);
        if (error) throw error;
      }

      // Update existing and insert new items
      for (const item of editingItems) {
        if (originalItemIds.includes(item.id)) {
          // Update existing item
          const { error: itemError } = await supabase
            .from('order_items')
            .update({
              quantity: item.quantity,
              price: item.price,
            })
            .eq('id', item.id);
          if (itemError) throw itemError;
        } else {
          // Insert new item
          const { error: insertError } = await supabase
            .from('order_items')
            .insert({
              order_id: order.id,
              product_id: item.product.id,
              quantity: item.quantity,
              price: item.price,
            });
          if (insertError) throw insertError;
        }
      }

      // The total is already updated above, no need to update again

      toast.success('Pedido actualizado exitosamente');
      setIsEditing(false);
      onOrderUpdated();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error al actualizar el pedido');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingOrder({});
    setEditingItems([]);
  };

  const confirmPayment = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'confirmed' })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Pago confirmado exitosamente');
      onOrderUpdated();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('No se pudo confirmar el pago');
    }
  };

  const updateItemField = (itemId: string, field: keyof OrderItem, value: any) => {
    setEditingItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setEditingItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleAddProduct = async () => {
    if (!selectedProductId) {
      toast.error('Selecciona un producto');
      return;
    }

    const selectedProduct = availableProducts.find(p => p.id === selectedProductId);
    if (!selectedProduct) return;

    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      quantity: newProductQuantity,
      price: selectedProduct.price,
      product: {
        id: selectedProduct.id,
        name: selectedProduct.name,
        images: selectedProduct.images || []
      }
    };

    setEditingItems(prev => [...prev, newItem]);
    setSelectedProductId('');
    setNewProductQuantity(1);
    setShowAddProduct(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getCustomerName = () => {
    if (order.source === 'shopify') {
      const customerData = order.customer_data as any;
      return customerData ? `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() : 'Cliente Shopify';
    }
    return order.customer?.name || 'Sin nombre';
  };

  const getCustomerContact = () => {
    if (order.source === 'shopify') {
      const customerData = order.customer_data as any;
      return customerData?.phone || customerData?.email || order.email || 'No disponible';
    }
    return order.customer?.phone || 'No disponible';
  };

  const currentTotal = isEditing 
    ? editingItems.reduce((sum, item) => sum + (item.quantity * item.price), 0) + ((order as any).shipping_cost || 0)
    : order.total;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Pedido {order.order_number ? `#${order.order_number}` : `#${order.id.slice(-8)}`}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  {(() => {
                    const StatusIcon = statusIcons[order.status as keyof typeof statusIcons] || Package;
                    return (
                      <>
                        <StatusIcon className="h-4 w-4" />
                        <Badge variant={statusColors[order.status as keyof typeof statusColors] || 'default'}>
                          {statusLabels[order.status as keyof typeof statusLabels] || order.status}
                        </Badge>
                        {order.order_source === 'agent' && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            Agente IA
                          </Badge>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            {order.source === 'local' && (
              <div className="flex gap-2">
                {!isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    {order.status !== 'entregado' && order.status !== 'cancelado' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleMarkAsDelivered}
                          className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Marcar Entregado
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Cancelar Pedido
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Cancelar este pedido?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción marcará el pedido como cancelado. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No, mantener</AlertDialogCancel>
                              <AlertDialogAction onClick={handleCancelOrder} className="bg-red-600 hover:bg-red-700">
                                Sí, cancelar pedido
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Cambios
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          <Separator />
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Nombre:</span>
                  <span>{getCustomerName()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Teléfono:</span>
                  <span>{getCustomerContact()}</span>
                </div>
                {order.customer?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Email:</span>
                    <span>{order.customer.email}</span>
                  </div>
                )}
                {order.customer?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="font-medium">Dirección:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.customer.address}
                        {order.customer.city && `, ${order.customer.city}`}
                        {order.customer.province && `, ${order.customer.province}`}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Información del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">Creado:</span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {order.updated_at && order.updated_at !== order.created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Actualizado:</span>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.updated_at).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4" />
                    Estado del Pedido
                  </Label>
                  {isEditing ? (
                    <Select
                      value={editingOrder.status}
                      onValueChange={(value) => setEditingOrder(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="preparado">Preparado</SelectItem>
                        <SelectItem value="en_camino">En Camino</SelectItem>
                        <SelectItem value="entregado">Entregado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const StatusIcon = statusIcons[order.status as keyof typeof statusIcons] || Package;
                        return <StatusIcon className="h-4 w-4" />;
                      })()}
                      <Badge variant={statusColors[order.status as keyof typeof statusColors] || 'default'}>
                        {statusLabels[order.status as keyof typeof statusLabels] || order.status}
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4" />
                    Método de Pago
                  </Label>
                  {isEditing ? (
                    <Select
                      value={editingOrder.payment_method || ''}
                      onValueChange={(value) => setEditingOrder(prev => ({ ...prev, payment_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pago Contra Entrega">Pago Contra Entrega</SelectItem>
                        <SelectItem value="Anticipado">Anticipado</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{order.payment_method || 'No especificado'}</span>
                      {order.source === 'local' && 
                       order.order_source === 'agent' && 
                       (order.payment_method === 'transfer' || order.payment_method === 'transferencia') && (
                        <Badge 
                          variant={paymentStatusColors[order.payment_status as keyof typeof paymentStatusColors] || 'default'}
                          className="text-xs"
                        >
                          {paymentStatusLabels[order.payment_status as keyof typeof paymentStatusLabels] || 'Pendiente'}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Tracking Number */}
                {(order.tracking_number || isEditing) && (
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4" />
                      Número de Seguimiento
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editingOrder.tracking_number || ''}
                        onChange={(e) => setEditingOrder(prev => ({ ...prev, tracking_number: e.target.value }))}
                        placeholder="Ej: TRK123456789"
                      />
                    ) : (
                      <div className="bg-muted p-2 rounded-md">
                        <code className="text-sm font-mono">
                          {order.tracking_number || 'Sin asignar'}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Confirmation Button */}
                {order.source === 'local' && 
                 order.order_source === 'agent' && 
                 (order.payment_method === 'transfer' || order.payment_method === 'transferencia') && 
                 order.payment_status === 'pending' && !isEditing && (
                  <div className="pt-2">
                    <Button
                      onClick={confirmPayment}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar Pago de Transferencia
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.source === 'shopify' ? (
                <div className="space-y-3">
                  {order.line_items?.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} x {formatPrice(Number(item.price))}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatPrice(Number(item.price) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {isEditing && (
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Productos del pedido</h4>
                      <Button 
                        onClick={() => setShowAddProduct(true)} 
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Producto
                      </Button>
                    </div>
                  )}

                  {showAddProduct && (
                    <Card className="p-4 border-dashed">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Producto</Label>
                          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar producto" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableProducts.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - ${product.price.toLocaleString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            min="1"
                            value={newProductQuantity}
                            onChange={(e) => setNewProductQuantity(parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button onClick={handleAddProduct} size="sm">
                          Agregar
                        </Button>
                        <Button 
                          onClick={() => setShowAddProduct(false)} 
                          variant="outline" 
                          size="sm"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </Card>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Precio Unit.</TableHead>
                        <TableHead>Subtotal</TableHead>
                        {isEditing && <TableHead>Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {(isEditing ? editingItems : order.order_items || []).map((item) => {
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {item.product.images && item.product.images.length > 0 && (
                                <img
                                  src={getImageUrl(item.product.images[0])}
                                  alt={item.product.name}
                                  className="w-12 h-12 object-cover rounded-md border"
                                />
                              )}
                              <div>
                                <span className="font-medium">{item.product.name}</span>
                                {/* Variants not supported in current schema */}
                              </div>
                            </div>
                          </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemField(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-20"
                            />
                          ) : (
                            item.quantity
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateItemField(item.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          ) : (
                            formatPrice(item.price)
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatPrice(item.quantity * item.price)}
                        </TableCell>
                        {isEditing && (
                          <TableCell>
                            <Button
                              onClick={() => removeItem(item.id)}
                              variant="outline"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-base">Subtotal productos:</span>
                    <span className="font-semibold">
                      {formatPrice(currentTotal - ((order as any).shipping_cost || 0))}
                    </span>
                  </div>
                  {order.source === 'local' && (order as any).shipping_cost >= 0 && (order as any).shipping_tariff_id && (
                    <div className="flex justify-between items-center">
                      <span className="text-base">Envío:</span>
                      <span className="font-semibold">
                        {(order as any).shipping_cost > 0 
                          ? formatPrice((order as any).shipping_cost) 
                          : 'Gratis'
                        }
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(currentTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notas del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editingOrder.notes || ''}
                  onChange={(e) => setEditingOrder(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Agregar notas, instrucciones especiales, comentarios del cliente..."
                  rows={4}
                  className="resize-none"
                />
              ) : (
                <div className="min-h-[60px] p-3 bg-muted/50 rounded-md border-l-4 border-l-primary/20">
                  {order.notes ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {order.notes}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic text-sm">
                      Sin notas adicionales para este pedido
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}