import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const orderSchema = z.object({
  customer_id: z.string().uuid(),
  customer_name: z.string().min(1, "Nombre es requerido"),
  customer_last_name: z.string().min(1, "Apellido es requerido"),
  customer_phone: z.string().min(1, "Teléfono es requerido"),
  customer_address: z.string().min(1, "Dirección es requerida"),
  customer_city: z.string().min(1, "Ciudad es requerida"),
  customer_province: z.string().min(1, "Provincia es requerida"),
  customer_email: z.string().email().optional().or(z.literal("")),
  payment_method: z.enum(["Pago Contra Entrega", "Anticipado"]),
  status: z.enum(["pendiente", "preparado"]),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().optional(),
    quantity: z.number().min(1),
    price: z.number().min(0)
  })).min(1, "Debe agregar al menos un producto")
});

type OrderFormData = z.infer<typeof orderSchema>;

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

interface ProductVariant {
  id: string;
  title: string;
  option1?: string;
  option2?: string;
  option3?: string;
  price: number;
  inventory_quantity: number;
  available: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  product_variants?: ProductVariant[];
}

interface CreateOrderFormProps {
  onOrderCreated: () => void;
  children: React.ReactNode;
}

export function CreateOrderForm({ onOrderCreated, children }: CreateOrderFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [orderItems, setOrderItems] = useState<Array<{ product_id: string; variant_id?: string; quantity: number; price: number }>>([]);
  const { user } = useAuth();

  console.log('CreateOrderForm render:', { isOpen, user: !!user, userLoading: !user });

  // Early return if no user to prevent issues
  if (!user) {
    console.log('CreateOrderForm: No user found, rendering empty');
    return <div>{children}</div>;
  }

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_name: "",
      customer_last_name: "",
      customer_phone: "",
      customer_address: "",
      customer_city: "",
      customer_province: "",
      customer_email: "",
      payment_method: "Pago Contra Entrega",
      status: "pendiente",
      notes: "",
      items: []
    }
  });

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      fetchProducts();
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive"
      });
    } else {
      setCustomers(data || []);
    }
  };

  const fetchProducts = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, price, stock,
        product_variants (
          id, title, option1, option2, option3, price, inventory_quantity, available
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    } else {
      setProducts(data || []);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    if (customerId === "new") {
      setIsNewCustomer(true);
      setSelectedCustomer(null);
      form.setValue("customer_id", "");
    } else {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomer(customer);
        setIsNewCustomer(false);
        form.setValue("customer_id", customer.id);
        form.setValue("customer_name", customer.name);
        form.setValue("customer_last_name", customer.last_name || "");
        form.setValue("customer_phone", customer.phone);
        form.setValue("customer_email", customer.email || "");
        form.setValue("customer_address", customer.address || "");
        form.setValue("customer_city", customer.city || "");
        form.setValue("customer_province", customer.province || "");
      }
    }
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { product_id: "", variant_id: undefined, quantity: 1, price: 0 }]);
  };

  const removeOrderItem = (index: number) => {
    const newItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(newItems);
    form.setValue("items", newItems);
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "product_id") {
      const product = products.find(p => p.id === value);
      if (product) {
        // Reset variant when product changes
        newItems[index].variant_id = undefined;
        
        // If product has variants, use the first available variant's price
        if (product.product_variants && product.product_variants.length > 0) {
          const firstAvailableVariant = product.product_variants.find(v => v.available);
          if (firstAvailableVariant) {
            newItems[index].price = firstAvailableVariant.price;
            newItems[index].variant_id = firstAvailableVariant.id;
          } else {
            newItems[index].price = product.price;
          }
        } else {
          newItems[index].price = product.price;
        }
      }
    }
    
    if (field === "variant_id") {
      const product = products.find(p => p.id === newItems[index].product_id);
      if (product && product.product_variants) {
        const variant = product.product_variants.find(v => v.id === value);
        if (variant) {
          newItems[index].price = variant.price;
        }
      }
    }
    
    setOrderItems(newItems);
    form.setValue("items", newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTotalWithShipping = (shippingCost = 0) => {
    return calculateTotal() + shippingCost;
  };

  const onSubmit = async (data: OrderFormData) => {
    if (!user) return;

    try {
      let customerId = data.customer_id;

      // Create new customer if needed
      if (isNewCustomer || !selectedCustomer || !selectedCustomer.address) {
        const customerData = {
          user_id: user.id,
          name: data.customer_name,
          last_name: data.customer_last_name,
          phone: data.customer_phone,
          email: data.customer_email || null,
          address: data.customer_address,
          city: data.customer_city,
          province: data.customer_province
        };

        if (selectedCustomer && !selectedCustomer.address) {
          // Update existing customer with address info
          const { error } = await supabase
            .from('customers')
            .update(customerData)
            .eq('id', selectedCustomer.id);

          if (error) throw error;
          customerId = selectedCustomer.id;
        } else {
          // Create new customer
          const { data: newCustomer, error } = await supabase
            .from('customers')
            .insert(customerData)
            .select()
            .single();

          if (error) throw error;
          customerId = newCustomer.id;
        }
      }

      // Create order
      const orderData = {
        user_id: user.id,
        customer_id: customerId,
        total: calculateTotal(),
        shipping_cost: 0,
        shipping_tariff_id: null,
        payment_method: data.payment_method,
        status: data.status,
        order_source: 'manual',
        notes: data.notes || null
      };

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsData = orderItems.map(item => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      toast({
        title: "Éxito",
        description: "Pedido creado correctamente"
      });

      setIsOpen(false);
      onOrderCreated();
      form.reset();
      setOrderItems([]);
      setSelectedCustomer(null);
      setIsNewCustomer(false);

    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el pedido",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('Dialog open state changing:', open);
      setIsOpen(open);
    }}>
      <DialogTrigger asChild onClick={() => {
        console.log('Dialog trigger clicked');
        setIsOpen(true);
      }}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Pedido</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Seleccionar Cliente</Label>
                  <Select onValueChange={handleCustomerSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">+ Nuevo Cliente</SelectItem>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer_last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customer_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!!(selectedCustomer && !isNewCustomer)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} disabled={!!(selectedCustomer && !isNewCustomer && selectedCustomer.email)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customer_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!!(selectedCustomer && !isNewCustomer && selectedCustomer.address)} />
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customer_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!!(selectedCustomer && !isNewCustomer && selectedCustomer.city)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer_province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provincia *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!!(selectedCustomer && !isNewCustomer && selectedCustomer.province)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Productos
                  <Button type="button" onClick={addOrderItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderItems.map((item, index) => {
                  const selectedProduct = products.find(p => p.id === item.product_id);
                  const hasVariants = selectedProduct?.product_variants && selectedProduct.product_variants.length > 0;
                  
                  return (
                    <div key={index} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center gap-4">
                        {/* Product Selection */}
                        <div className="flex-1">
                          <Label className="text-sm font-medium mb-2 block">Producto</Label>
                          <Select
                            value={item.product_id}
                            onValueChange={(value) => updateOrderItem(index, "product_id", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar producto..." />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(product => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - ${product.price.toLocaleString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Remove Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeOrderItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Variant Selection - Only show if product has variants */}
                      {hasVariants && (
                        <div className="flex-1">
                          <Label className="text-sm font-medium mb-2 block">Variante</Label>
                          <Select
                            value={item.variant_id || ""}
                            onValueChange={(value) => updateOrderItem(index, "variant_id", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar variante..." />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedProduct?.product_variants?.filter(v => v.available).map(variant => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {variant.title} - ${variant.price.toLocaleString()} 
                                  {variant.inventory_quantity > 0 && ` (Stock: ${variant.inventory_quantity})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {/* Quantity and Price */}
                      <div className="flex items-center gap-4">
                        <div className="w-24">
                          <Label className="text-sm font-medium mb-2 block">Cantidad</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, "quantity", parseInt(e.target.value) || 1)}
                            placeholder="Cant."
                          />
                        </div>
                        
                        <div className="w-32">
                          <Label className="text-sm font-medium mb-2 block">Precio</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateOrderItem(index, "price", parseFloat(e.target.value) || 0)}
                            placeholder="Precio"
                          />
                        </div>
                        
                        <div className="flex-1 text-right">
                          <Label className="text-sm font-medium mb-2 block">Subtotal</Label>
                          <div className="text-lg font-semibold">
                            ${(item.price * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {orderItems.length > 0 && (
                  <div className="text-right font-semibold text-lg">
                    Total: ${calculateTotal().toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método de Pago</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pago Contra Entrega">Pago Contra Entrega</SelectItem>
                            <SelectItem value="Anticipado">Anticipado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="preparado">Preparado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Notas adicionales del pedido..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear Pedido
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}