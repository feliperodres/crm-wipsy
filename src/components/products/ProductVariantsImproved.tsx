import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriceInput } from '@/components/ui/price-input';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Settings, Package, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { OptionsManager } from './OptionsManager';

interface ProductVariant {
  id?: string;
  title: string;
  option1?: string;
  option2?: string;
  option3?: string;
  price: number;
  compare_at_price?: number;
  inventory_quantity: number;
  sku?: string;
  barcode?: string;
  available: boolean;
  weight?: number;
  weight_unit: string;
  position?: number;
}

interface VariantOption {
  name: string;
  values: string[];
}

interface ProductVariantsProps {
  productId: string;
  userId: string;
  variants: ProductVariant[];
  onVariantsChange: (variants: ProductVariant[]) => void;
}

export function ProductVariants({ productId, userId, variants, onVariantsChange }: ProductVariantsProps) {
  const [options, setOptions] = useState<VariantOption[]>([]);
  const [editingVariant, setEditingVariant] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  // Add error boundary
  if (!productId || !userId) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Error: Faltan datos del producto o usuario</p>
      </div>
    );
  }

  // Load existing options from variants
  useEffect(() => {
    try {
      console.log('ProductVariants useEffect - variants:', variants);
      
      if (variants.length > 0) {
        const extractedOptions: VariantOption[] = [];
        
        // Extract option1 values
        const option1Values = [...new Set(variants.map(v => v.option1).filter(Boolean))];
        if (option1Values.length > 0) {
          extractedOptions.push({ name: 'Opción 1', values: option1Values });
        }
        
        // Extract option2 values
        const option2Values = [...new Set(variants.map(v => v.option2).filter(Boolean))];
        if (option2Values.length > 0) {
          extractedOptions.push({ name: 'Opción 2', values: option2Values });
        }
        
        // Extract option3 values
        const option3Values = [...new Set(variants.map(v => v.option3).filter(Boolean))];
        if (option3Values.length > 0) {
          extractedOptions.push({ name: 'Opción 3', values: option3Values });
        }
        
        console.log('Extracted options:', extractedOptions);
        setOptions(extractedOptions);
      } else {
        console.log('No variants found, resetting options');
        setOptions([]);
      }
      setIsInitialized(true);
    } catch (error) {
      console.error('Error in ProductVariants useEffect:', error);
      setOptions([]);
      setIsInitialized(true);
    }
  }, [variants]);

  // DISABLED: Auto-generation was causing infinite loops
  // We'll go back to manual generation with a button for now
  // useEffect(() => {
  //   if (isInitialized && options.length > 0 && options.some(opt => opt.values.length > 0)) {
  //     const timeoutId = setTimeout(() => {
  //       generateVariantsFromOptions();
  //     }, 1000);
  //     return () => clearTimeout(timeoutId);
  //   }
  // }, [options, isInitialized]);

  const generateVariantsFromOptions = async () => {
    if (options.length === 0) {
      toast({
        title: "Error",
        description: "Debe definir al menos una opción con valores para generar variantes",
        variant: "destructive"
      });
      return;
    }
    
    // Validar que todas las opciones tengan al menos un valor
    const invalidOptions = options.filter(opt => opt.values.length === 0);
    if (invalidOptions.length > 0) {
      toast({
        title: "Error",
        description: `Las siguientes opciones no tienen valores: ${invalidOptions.map(opt => opt.name).join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('🔄 Starting intelligent variant generation...');
      console.log('📊 Current variants:', variants.length);
      console.log('⚙️ Current options:', options);
      
      // Generate all possible combinations based on current options
      const newCombinations: ProductVariant[] = [];
      let positionCounter = Math.max(...variants.map(v => v.position || 0), 0) + 1;
      
      if (options.length === 1) {
        options[0].values.forEach((value1) => {
          newCombinations.push({
            title: value1,
            option1: value1,
            option2: null,
            option3: null,
            price: 0,
            inventory_quantity: 0,
            available: true,
            weight_unit: 'kg',
            position: positionCounter++
          });
        });
      } else if (options.length === 2) {
        options[0].values.forEach(value1 => {
          options[1].values.forEach(value2 => {
            newCombinations.push({
              title: `${value1} / ${value2}`,
              option1: value1,
              option2: value2,
              option3: null,
              price: 0,
              inventory_quantity: 0,
              available: true,
              weight_unit: 'kg',
              position: positionCounter++
            });
          });
        });
      } else if (options.length === 3) {
        options[0].values.forEach(value1 => {
          options[1].values.forEach(value2 => {
            options[2].values.forEach(value3 => {
              newCombinations.push({
                title: `${value1} / ${value2} / ${value3}`,
                option1: value1,
                option2: value2,
                option3: value3,
                price: 0,
                inventory_quantity: 0,
                available: true,
                weight_unit: 'kg',
                position: positionCounter++
              });
            });
          });
        });
      }

      // Function to check if two variants have the same option combination
      const variantMatchesOptions = (variant: ProductVariant, newVariant: ProductVariant) => {
        const normalize = (value: string | null | undefined) => value || null;
        
        // console.log(`🔍 Comparing variants:`, {
        //   existing: { opt1: normalize(variant.option1), opt2: normalize(variant.option2), opt3: normalize(variant.option3) },
        //   new: { opt1: normalize(newVariant.option1), opt2: normalize(newVariant.option2), opt3: normalize(newVariant.option3) }
        // });
        
        return normalize(variant.option1) === normalize(newVariant.option1) && 
               normalize(variant.option2) === normalize(newVariant.option2) && 
               normalize(variant.option3) === normalize(newVariant.option3);
      };

      // Identify which variants to keep, update, or create
      const variantsToKeep: ProductVariant[] = [];
      const variantsToDelete: string[] = [];
      const variantsToCreate: ProductVariant[] = [];

      // Check existing variants
      console.log('🔍 Analyzing existing variants...');
      variants.forEach(existingVariant => {
        const matchingNew = newCombinations.find(newVar => variantMatchesOptions(existingVariant, newVar));
        if (matchingNew) {
          // Keep existing variant (preserve price, stock, etc.)
          console.log(`✅ Keeping variant: ${existingVariant.title} (${existingVariant.option1})`);
          variantsToKeep.push(existingVariant);
        } else {
          // Mark for deletion (no longer valid combination)
          console.log(`❌ Marking for deletion: ${existingVariant.title} (${existingVariant.option1})`);
          if (existingVariant.id) {
            variantsToDelete.push(existingVariant.id);
          }
        }
      });

      // Check which new combinations don't exist yet
      console.log('🆕 Checking for new combinations...');
      newCombinations.forEach(newVariant => {
        const existingMatch = variants.find(existing => variantMatchesOptions(existing, newVariant));
        if (!existingMatch) {
          // This is a new combination, create it
          console.log(`✨ New variant to create: ${newVariant.title} (${newVariant.option1})`);
          variantsToCreate.push(newVariant);
        }
      });
      
      console.log('📋 Summary:');
      console.log(`- To keep: ${variantsToKeep.length}`);
      console.log(`- To create: ${variantsToCreate.length}`);
      console.log(`- To delete: ${variantsToDelete.length}`);

      // Execute database operations
      
      // 1. Delete variants that are no longer valid
      if (variantsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_variants')
          .delete()
          .in('id', variantsToDelete);
        
        if (deleteError) throw deleteError;
        console.log(`Deleted ${variantsToDelete.length} obsolete variants`);
      }

      // 2. Insert new variants
      let insertedVariants: ProductVariant[] = [];
      if (variantsToCreate.length > 0) {
        const variantsToInsert = variantsToCreate.map(variant => ({
          product_id: productId,
          user_id: userId,
          title: variant.title,
          option1: variant.option1 || null,
          option2: variant.option2 || null,
          option3: variant.option3 || null,
          price: variant.price,
          inventory_quantity: variant.inventory_quantity,
          available: variant.available,
          weight_unit: variant.weight_unit,
          position: variant.position
        }));
        
        const { data, error: insertError } = await supabase
          .from('product_variants')
          .insert(variantsToInsert)
          .select();
        
        if (insertError) throw insertError;
        insertedVariants = data || [];
        console.log(`Created ${insertedVariants.length} new variants`);
      }

      // 3. Update local state with kept + new variants
      const finalVariants = [...variantsToKeep, ...insertedVariants];
      onVariantsChange(finalVariants);
      
      // Show summary
      const summary = [];
      if (variantsToKeep.length > 0) summary.push(`${variantsToKeep.length} mantenidas`);
      if (insertedVariants.length > 0) summary.push(`${insertedVariants.length} nuevas`);
      if (variantsToDelete.length > 0) summary.push(`${variantsToDelete.length} eliminadas`);
      
      toast({
        title: "Éxito",
        description: `Variantes actualizadas: ${summary.join(', ')}`,
      });
      
    } catch (error) {
      console.error('Error generating variants:', error);
      toast({
        title: "Error",
        description: "No se pudieron generar las variantes. Verifique los datos e intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateVariant = async (index: number, field: string, value: any) => {
    const variant = variants[index];
    if (!variant.id) return;

    try {
      const updateData = { [field]: value };
      
      const { error } = await supabase
        .from('product_variants')
        .update(updateData)
        .eq('id', variant.id);

      if (error) throw error;

      const updatedVariants = [...variants];
      updatedVariants[index] = { ...variant, [field]: value };
      onVariantsChange(updatedVariants);

    } catch (error) {
      console.error('Error updating variant:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la variante",
        variant: "destructive"
      });
    }
  };

  const deleteVariant = async (index: number) => {
    try {
      const variant = variants[index];
      if (variant.id) {
        const { error } = await supabase
          .from('product_variants')
          .delete()
          .eq('id', variant.id);

        if (error) throw error;
      }

      const updatedVariants = variants.filter((_, i) => i !== index);
      onVariantsChange(updatedVariants);

      toast({
        title: "Éxito",
        description: "Variante eliminada correctamente"
      });
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la variante",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Variantes del Producto</Label>
        {variants.length > 0 && (
          <Badge variant="secondary">{variants.length} variante{variants.length !== 1 ? 's' : ''}</Badge>
        )}
      </div>

      {/* Step 1: Configure Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Paso 1: Configurar Opciones del Producto
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Define las opciones como Color, Talla, Material, etc. y sus valores
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-sm text-muted-foreground">Generando variantes...</span>
            </div>
          ) : (
            <OptionsManager 
              options={options}
              onOptionsChange={setOptions}
              onGenerateVariants={generateVariantsFromOptions}
              onValueAdded={generateVariantsFromOptions}
            />
          )}
        </CardContent>
      </Card>

      {/* Step 2: Generated Variants */}
      {variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Paso 2: Variantes Generadas
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Configura el precio y stock para cada variante
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div key={variant.id || index} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{variant.title}</h4>
                        <div className="flex gap-2 mt-1">
                          {variant.option1 && <Badge variant="outline" className="text-xs">{variant.option1}</Badge>}
                          {variant.option2 && <Badge variant="outline" className="text-xs">{variant.option2}</Badge>}
                          {variant.option3 && <Badge variant="outline" className="text-xs">{variant.option3}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Disponible</Label>
                        <Switch
                          checked={variant.available}
                          onCheckedChange={(checked) => updateVariant(index, 'available', checked)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteVariant(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs">Precio *</Label>
                      <PriceInput
                        value={variant.price}
                        onChange={(price) => updateVariant(index, 'price', price)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Stock</Label>
                      <Input
                        type="number"
                        value={variant.inventory_quantity}
                        onChange={(e) => updateVariant(index, 'inventory_quantity', parseInt(e.target.value) || 0)}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">SKU (Opcional)</Label>
                      <Input
                        value={variant.sku || ''}
                        onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                        className="mt-1"
                        placeholder="SKU-001"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {variants.length === 0 && options.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Sin variantes</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Comience definiendo las opciones del producto para generar variantes automáticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
