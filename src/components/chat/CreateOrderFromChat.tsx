import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Bot, Trash2, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Interfaces for product variants
interface ProductVariant {
  id: string;
  product_id: string;
  title: string;
  option1: string;
  option2?: string | null;
  option3?: string | null;
  price: number;
  inventory_quantity: number;
  available: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  product_variants?: ProductVariant[];
}

const orderSchema = z.object({
  customer: z.object({
    name: z.string().min(1, "Nombre es requerido"),
    lastName: z.string().min(1, "Apellido es requerido"), 
    phone: z.string().min(1, "Teléfono es requerido"),
    email: z.string().optional().refine(val => !val || z.string().email().safeParse(val).success, "Email inválido"),
    address: z.string().min(1, "Dirección es requerida"),
    city: z.string().min(1, "Ciudad es requerida"),
    province: z.string().min(1, "Provincia es requerida"),
  }),
  products: z.array(z.object({
    id: z.string().min(1, "ID del producto es requerido"),
    name: z.string().min(1, "Nombre del producto es requerido"),
    quantity: z.number().min(1, "Cantidad debe ser mayor a 0"),
    price: z.number().min(0, "Precio debe ser mayor o igual a 0"),
    variant_id: z.string().optional(),
    variant_name: z.string().optional(),
  })).min(1, "Debe seleccionar al menos un producto"),
  paymentMethod: z.enum(["Pago Contra Entrega", "Anticipado"]),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface CreateOrderFromChatProps {
  chatId: string;
  customerId: string;
  customerName: string;
}

export const CreateOrderFromChat = ({ chatId, customerId, customerName }: CreateOrderFromChatProps) => {
  const [open, setOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [usedAIAnalysis, setUsedAIAnalysis] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer: {
        name: "",
        lastName: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        province: "",
      },
      products: [],
      paymentMethod: "Pago Contra Entrega",
      notes: "",
    },
  });

  // Filtrar productos basado en el término de búsqueda
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return availableProducts.slice(0, 6); // Mostrar solo 6 productos inicialmente
    
    return availableProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableProducts, searchTerm]);

  const fetchProducts = async () => {
    try {
      console.log('Fetching products with user_id:', user?.id);
      
      if (!user?.id) {
        console.error('No user ID available');
        toast({
          title: "Error",
          description: "Usuario no autenticado",
          variant: "destructive",
        });
        return;
      }
      
      // First try without variants to see if basic query works
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      // If basic query works, then fetch variants separately
      if (!error && data) {
        console.log('Basic products query successful, now fetching variants...');
        
        // Fetch variants for each product
        const productsWithVariants = await Promise.all(
          data.map(async (product) => {
            const { data: variants, error: variantError } = await supabase
              .from('product_variants')
              .select('*')
              .eq('product_id', product.id);
            
            if (variantError) {
              console.error('Error fetching variants for product', product.id, ':', variantError);
            }
            
            return {
              ...product,
              product_variants: variants || []
            };
          })
        );
        
        console.log('Products with variants:', productsWithVariants);
        
        // Log detailed variant info for debugging
        productsWithVariants.forEach(product => {
          console.log(`Product ${product.name}:`, {
            id: product.id,
            hasVariants: product.product_variants?.length > 0,
            variantCount: product.product_variants?.length || 0,
            variants: product.product_variants
          });
        });
        
        setAvailableProducts(productsWithVariants);
        return;
      }
      
      if (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Error",
          description: `No se pudieron cargar los productos: ${error.message}`,
          variant: "destructive",
        });
        return;
      }
      
      console.log('Products fetched successfully:', data);
      setAvailableProducts(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar productos",
        variant: "destructive",
      });
    }
  };

  const analyzeConversation = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-conversation-for-order', {
        body: { chatId }
      });

      if (error) throw error;

      const analysis = data.analysis;
      
      if (analysis.hasOrderInfo && analysis.confidence > 50) {
        // Llenar el formulario con la información extraída
        form.setValue('customer', {
          name: analysis.customer.name || "",
          lastName: analysis.customer.lastName || "",
          phone: analysis.customer.phone || "",
          email: analysis.customer.email || "",
          address: analysis.customer.address || "",
          city: analysis.customer.city || "",
          province: analysis.customer.province || "",
        });

        if (analysis.products.length > 0) {
          form.setValue('products', analysis.products);
        }

        if (analysis.paymentMethod) {
          form.setValue('paymentMethod', analysis.paymentMethod);
        }

        if (analysis.notes) {
          form.setValue('notes', analysis.notes);
        }

        setUsedAIAnalysis(true);
        toast({
          title: "Análisis completado",
          description: `Información extraída con ${analysis.confidence}% de confianza`,
        });
      } else {
        toast({
          title: "Información insuficiente",
          description: "No se pudo extraer información suficiente del pedido de la conversación",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      toast({
        title: "Error",
        description: "Error al analizar la conversación",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddProduct = (product: Product, variantId?: string) => {
    console.log('🛒 Adding product:', {
      productName: product.name,
      productId: product.id,
      hasVariants: product.product_variants?.length > 0,
      variantCount: product.product_variants?.length || 0,
      variantId,
      currentProducts: form.getValues('products').length
    });
    
    // Si el producto tiene variantes y no se especificó una variante
    if (product.product_variants && product.product_variants.length > 0 && !variantId) {
      console.log('Product has variants, opening variant selection dialog');
      setSelectedProductForVariant(product);
      setSelectedVariantId('');
      return;
    }
    
    console.log('Adding product directly (no variants or variant specified)');

    const currentProducts = form.getValues('products');
    let productToAdd;
    let uniqueKey;

    if (variantId && product.product_variants) {
      const variant = product.product_variants.find(v => v.id === variantId);
      if (!variant || !variant.available || variant.inventory_quantity <= 0) return;

      const variantName = [variant.option1, variant.option2, variant.option3]
        .filter(Boolean)
        .join(' - ');

      productToAdd = {
        id: product.id,
        name: product.name,
        quantity: 1,
        price: variant.price,
        variant_id: variantId,
        variant_name: variantName,
      };
      uniqueKey = `${product.id}-${variantId}`;
    } else {
      productToAdd = {
        id: product.id,
        name: product.name,
        quantity: 1,
        price: product.price,
        variant_id: undefined,
        variant_name: undefined,
      };
      uniqueKey = product.id;
    }

    const existingIndex = currentProducts.findIndex(p => {
      if (p.variant_id && productToAdd.variant_id) {
        return p.id === product.id && p.variant_id === productToAdd.variant_id;
      }
      return p.id === product.id && !p.variant_id && !productToAdd.variant_id;
    });
    
    if (existingIndex >= 0) {
      const updated = [...currentProducts];
      updated[existingIndex].quantity += 1;
      form.setValue('products', updated);
    } else {
      form.setValue('products', [...currentProducts, productToAdd]);
    }

    // Reset variant selection
    setSelectedProductForVariant(null);
    setSelectedVariantId('');
    
    console.log('✅ Product added successfully, current products:', form.getValues('products'));
  };

  const handleRemoveProduct = (productId: string, variantId?: string) => {
    const currentProducts = form.getValues('products');
    const filtered = currentProducts.filter(p => {
      if (variantId) {
        return !(p.id === productId && p.variant_id === variantId);
      }
      return !(p.id === productId && !p.variant_id);
    });
    form.setValue('products', filtered);
  };

  const updateProductQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      handleRemoveProduct(productId, variantId);
      return;
    }
    
    const currentProducts = form.getValues('products');
    const updated = currentProducts.map(p => {
      if (variantId) {
        return (p.id === productId && p.variant_id === variantId) ? { ...p, quantity } : p;
      }
      return (p.id === productId && !p.variant_id) ? { ...p, quantity } : p;
    });
    form.setValue('products', updated);
  };

  const calculateTotal = () => {
    const products = form.watch('products');
    return products.reduce((total, product) => total + (product.price * product.quantity), 0);
  };

  const onSubmit = async (data: OrderFormData) => {
    console.log('🚀 Starting form submission with data:', data);
    console.log('🔍 Form validation state:', form.formState);
    console.log('🔍 Form errors:', form.formState.errors);
    
    // Validación manual detallada de productos
    console.log('🔍 Manual product validation:');
    data.products?.forEach((product, index) => {
      console.log(`Product ${index}:`, {
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        price: product.price,
        variant_id: product.variant_id,
        variant_name: product.variant_name,
        idValid: !!product.id && product.id.length > 0,
        nameValid: !!product.name && product.name.length > 0,
        quantityValid: typeof product.quantity === 'number' && product.quantity > 0,
        priceValid: typeof product.price === 'number' && product.price >= 0
      });
    });
    
    setIsSubmitting(true);
    try {
      // Validar que hay productos seleccionados
      if (!data.products || data.products.length === 0) {
        toast({
          title: "Error",
          description: "Debe seleccionar al menos un producto",
          variant: "destructive",
        });
        return;
      }

      // Validar campos requeridos del cliente
      const requiredFields = ['name', 'lastName', 'phone', 'address', 'city', 'province'];
      const missingFields = requiredFields.filter(field => !data.customer[field as keyof typeof data.customer]);
      
      if (missingFields.length > 0) {
        toast({
          title: "Error",
          description: `Faltan campos requeridos: ${missingFields.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Validation passed, proceeding with order creation');

      // Verificar si el cliente ya existe
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('id', customerId)
        .single();

      let finalCustomerId = customerId;

      if (!existingCustomer || customerError) {
        // Crear nuevo cliente
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            user_id: user?.id,
            name: data.customer.name,
            last_name: data.customer.lastName,
            phone: data.customer.phone,
            email: data.customer.email,
            address: data.customer.address,
            city: data.customer.city,
            province: data.customer.province,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        finalCustomerId = newCustomer.id;
      } else {
        // Actualizar cliente existente
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            name: data.customer.name,
            last_name: data.customer.lastName,
            phone: data.customer.phone,
            email: data.customer.email,
            address: data.customer.address,
            city: data.customer.city,
            province: data.customer.province,
          })
          .eq('id', customerId);

        if (updateError) throw updateError;
      }

      // Crear orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          customer_id: finalCustomerId,
          total: calculateTotal(),
          payment_method: data.paymentMethod,
          notes: data.notes,
          status: 'pendiente',
          order_source: usedAIAnalysis ? 'agent' : 'manual', // Set based on whether AI analysis was used
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      // Crear items de la orden
      const orderItems = data.products.map(product => ({
        order_id: order.id,
        product_id: product.id,
        quantity: product.quantity,
        price: product.price,
        // Note: variant_id not included as the order_items table doesn't have this column
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Pedido creado",
        description: "El pedido se ha creado exitosamente",
      });

      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error('❌ Error creating order:', error);
      toast({
        title: "Error",
        description: `Error al crear el pedido: ${error.message || 'Error desconocido'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchProducts();
      // Llenar automáticamente la información del cliente desde el chat
      fillCustomerDataFromChat();
      // Limpiar el término de búsqueda
      setSearchTerm('');
      // Resetear el estado de análisis de IA
      setUsedAIAnalysis(false);
    }
  };

  const fillCustomerDataFromChat = async () => {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error || !customer) {
        // Si no existe el cliente, usar datos básicos del chat
        form.setValue('customer', {
          name: customerName || "",
          lastName: "",
          phone: "",
          email: "",
          address: "",
          city: "",
          province: "",
        });
        return;
      }

      // Llenar con datos del cliente existente
      form.setValue('customer', {
        name: customer.name || "",
        lastName: customer.last_name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        city: customer.city || "",
        province: customer.province || "",
      });
    } catch (error) {
      console.error('Error fetching customer data:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Crear Pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Pedido - {customerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button 
            onClick={analyzeConversation}
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bot className="h-4 w-4 mr-2" />
            )}
            Analizar Conversación con IA
          </Button>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.log('❌ Form validation errors:', errors);
              toast({
                title: "Error de validación",
                description: "Por favor revisa los campos marcados en rojo",
                variant: "destructive",
              });
            })} className="space-y-6">
              {/* Información del Cliente */}
              <Card>
                <CardHeader>
                  <CardTitle>Información del Cliente</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customer.name"
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
                    name="customer.lastName"
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

                  <FormField
                    control={form.control}
                    name="customer.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer.address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Dirección *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer.province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provincia *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Productos */}
              <Card>
                <CardHeader>
                  <CardTitle>Productos</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Buscador de productos */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Lista de productos filtrados */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 max-h-60 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="col-span-2 text-center py-4 text-muted-foreground">
                        {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <div key={product.id} className="border rounded p-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">${product.price}</p>
                            {product.product_variants && product.product_variants.length > 0 && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {product.product_variants.length} variantes
                              </Badge>
                            )}
                          </div>
                          <Button 
                            type="button"
                            size="sm" 
                            onClick={() => handleAddProduct(product)}
                          >
                            Agregar
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Mostrar información sobre productos totales */}
                  {!searchTerm && availableProducts.length > 6 && (
                    <div className="text-center mb-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Mostrando 6 de {availableProducts.length} productos. 
                        <span className="font-medium"> Usa el buscador para encontrar productos específicos.</span>
                      </p>
                    </div>
                  )}

                  {/* Productos seleccionados */}
                  <div className="space-y-2">
                    {form.watch('products').map((product, index) => (
                      <div key={`${product.id}-${product.variant_id || 'no-variant'}-${index}`} className="flex items-center justify-between bg-muted p-3 rounded">
                        <div>
                          <span className="font-medium">{product.name}</span>
                          {product.variant_name && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {product.variant_name}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground ml-2">
                            ${product.price} c/u
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={product.quantity}
                            onChange={(e) => updateProductQuantity(product.id, parseInt(e.target.value) || 0, product.variant_id)}
                            className="w-20"
                            min="1"
                          />
                          <Badge variant="secondary">
                            ${(product.price * product.quantity).toFixed(2)}
                          </Badge>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveProduct(product.id, product.variant_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detalles del Pedido */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalles del Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método de Pago *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar método de pago" />
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

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  onClick={(e) => {
                    console.log('🖱️ Submit button clicked');
                    const formValues = form.getValues();
                    const formErrors = form.formState.errors;
                    console.log('🔍 Current form values:', formValues);
                    console.log('🔍 Form errors:', formErrors);
                    console.log('🔍 Form is valid:', form.formState.isValid);
                    
                    // Debug específico de productos
                    console.log('🛒 Products debug:');
                    console.log('  - Products array:', formValues.products);
                    console.log('  - Products length:', formValues.products?.length);
                    console.log('  - Products errors:', formErrors.products);
                    
                    // Validar cada producto individualmente
                    formValues.products?.forEach((product, index) => {
                      console.log(`  - Product ${index}:`, product);
                      console.log(`  - Product ${index} validation:`, {
                        hasId: !!product.id,
                        hasName: !!product.name,
                        hasQuantity: product.quantity > 0,
                        hasPrice: product.price >= 0,
                        quantity: product.quantity,
                        price: product.price
                      });
                    });
                  }}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Crear Pedido
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>

      {/* Dialog para seleccionar variantes */}
      {selectedProductForVariant && (
        <Dialog open={!!selectedProductForVariant} onOpenChange={() => setSelectedProductForVariant(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Seleccionar Variante</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedProductForVariant.name}</p>
                <p className="text-sm text-muted-foreground">Selecciona una variante:</p>
              </div>
              
              <div className="space-y-2">
                {selectedProductForVariant.product_variants?.map((variant) => {
                  const variantName = [variant.option1, variant.option2, variant.option3]
                    .filter(Boolean)
                    .join(' - ');
                  
                  return (
                    <div 
                      key={variant.id}
                      className={`border rounded p-3 cursor-pointer hover:bg-muted transition-colors ${
                        selectedVariantId === variant.id ? 'border-primary bg-muted' : ''
                      }`}
                      onClick={() => setSelectedVariantId(variant.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{variantName}</p>
                          <p className="text-sm text-muted-foreground">Stock: {variant.inventory_quantity}</p>
                        </div>
                        <p className="font-semibold">${variant.price}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedProductForVariant(null)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => handleAddProduct(selectedProductForVariant, selectedVariantId)}
                  disabled={!selectedVariantId}
                >
                  Agregar Variante
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};