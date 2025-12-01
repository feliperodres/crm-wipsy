import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInventory, getInventory, InventoryProduct } from '@/hooks/useInventory';
import { Package, AlertTriangle, TrendingUp } from 'lucide-react';

export function InventoryExample() {
  // Usuario de ejemplo - reemplaza con el userId real
  const userId = "e271fcc4-1822-4da8-8439-0b67e828a17f"; // Tu userId del contexto
  
  // Ejemplo 1: Usando el hook personalizado
  const { inventory, loading, error, fetchInventory } = useInventory(userId);

  useEffect(() => {
    fetchInventory();
  }, []);

  // Ejemplo 2: Función manual para obtener inventario de un usuario específico
  const handleGetSpecificUserInventory = async (targetUserId: string) => {
    try {
      const data = await getInventory(targetUserId);
      console.log('Inventario del usuario:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Ejemplo 3: Función para obtener mi propio inventario
  const handleGetMyInventory = async () => {
    try {
      const data = await getInventory(userId); // Con userId específico
      console.log('Mi inventario:', data);
      
      // Ejemplo de cómo usar los datos
      console.log('Total de productos:', data.summary.totalProducts);
      console.log('Stock total:', data.summary.totalStock);
      console.log('Productos con stock bajo:', data.summary.lowStockProducts);
      
      // Iterar productos
      data.products.forEach(product => {
        console.log(`Producto: ${product.name}`);
        console.log(`Precio base: $${product.basePrice}`);
        console.log(`Stock: ${product.totalStock}`);
        console.log(`Variantes: ${product.variants.length}`);
        console.log('---');
      });
      
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando inventario...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error al cargar inventario</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchInventory}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API del Inventario - Ejemplos</h2>
        <div className="space-x-2">
          <Button onClick={handleGetMyInventory} variant="outline">
            Obtener Mi Inventario
          </Button>
          <Button onClick={fetchInventory}>
            Refrescar
          </Button>
        </div>
      </div>

      {inventory && (
        <>
          {/* Resumen del inventario */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventory.summary.totalProducts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventory.summary.totalStock}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {inventory.summary.lowStockProducts}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Variantes</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventory.summary.totalVariants}</div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de productos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inventory.products.map((product: InventoryProduct) => (
              <Card key={product.id}>
                <CardHeader>
                  {product.coverImage && (
                    <div className="w-full h-32 bg-muted rounded-md mb-3 overflow-hidden">
                      <img 
                        src={product.coverImage} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Precio:</span>
                    <span className="font-semibold">${product.basePrice.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Stock:</span>
                    <Badge variant={product.totalStock > 5 ? "default" : "destructive"}>
                      {product.totalStock} unidades
                    </Badge>
                  </div>
                  
                  {product.category && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Categoría:</span>
                      <span className="text-sm">{product.category}</span>
                    </div>
                  )}

                  {product.variants.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Variantes:</span>
                      <Badge variant="secondary">{product.variants.length}</Badge>
                    </div>
                  )}

                  {product.vendor && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Proveedor:</span>
                      <span className="text-sm">{product.vendor}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Información de la API */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Endpoint:</strong> https://fczgowziugcvrpgfelks.supabase.co/functions/v1/inventory-api</p>
            <p><strong>Método:</strong> GET</p>
            <p><strong>Autenticación:</strong> No requerida</p>
            <p><strong>Parámetros requeridos:</strong> ?userId=TU_USER_ID o ?userHash=TU_USER_HASH</p>
            <p><strong>Usuario actual:</strong> {inventory?.userId || 'No cargado'}</p>
            <p><strong>Ejemplo CURL:</strong></p>
            <code className="block bg-muted p-2 rounded text-xs">
              curl "https://fczgowziugcvrpgfelks.supabase.co/functions/v1/inventory-api?userId=e271fcc4-1822-4da8-8439-0b67e828a17f"
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}