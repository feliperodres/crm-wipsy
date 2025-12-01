import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Store, Upload, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface AdminShopifyManagerProps {
  userDetails: any[] | undefined;
}

export const AdminShopifyManager = ({ userDetails }: AdminShopifyManagerProps) => {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState<'orders' | 'products' | null>(null);

  // Query para obtener usuarios con info de Shopify
  const { data: usersWithShopify, refetch: refetchUsers } = useQuery({
    queryKey: ['users-with-shopify'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopify_integrations')
        .select('user_id, shop_domain, connection_status, last_sync_at')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Create a map of user_id to shopify info
      const shopifyMap = new Map();
      data?.forEach(integration => {
        shopifyMap.set(integration.user_id, integration);
      });
      
      return shopifyMap;
    },
  });

  // Query para obtener la integración existente del usuario seleccionado
  const { data: integration, refetch: refetchIntegration } = useQuery({
    queryKey: ['shopify-integration', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      const { data, error } = await supabase
        .from('shopify_integrations')
        .select('*')
        .eq('user_id', selectedUserId)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!selectedUserId,
  });

  const selectedUser = userDetails?.find(u => u.user_id === selectedUserId);

  const handleBack = () => {
    setSelectedUserId(null);
    setShopDomain('');
    setAccessToken('');
    setImportStep(null);
    refetchUsers();
  };

  const handleValidateAndSave = async () => {
    if (!shopDomain || !accessToken || !selectedUserId) {
      toast({
        title: "Campos requeridos",
        description: "Debes proporcionar el dominio y token de acceso",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-shopify-credentials', {
        body: {
          shopDomain,
          accessToken,
          userId: selectedUserId
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Integración configurada",
        description: `Shopify conectado para ${selectedUser?.email}`,
      });

      refetchIntegration();
      setShopDomain('');
      setAccessToken('');
    } catch (error) {
      console.error('Error validating credentials:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al validar credenciales",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleImportOrders = async () => {
    if (!integration || !selectedUserId) return;

    setIsImporting(true);
    setImportStep('orders');
    try {
      const { data, error } = await supabase.functions.invoke('shopify-import-orders', {
        body: {
          shopDomain: integration.shop_domain,
          accessToken: integration.access_token_encrypted,
          userId: selectedUserId,
          daysBack: 30
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Órdenes importadas",
        description: `${data?.imported || 0} órdenes importadas`,
      });
    } catch (error) {
      console.error('Error importing orders:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al importar órdenes",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      setImportStep(null);
    }
  };

  const handleImportProducts = async () => {
    if (!integration || !selectedUserId) return;

    setIsImporting(true);
    setImportStep('products');
    try {
      let totalImported = 0;
      let pageInfo: string | null = null;
      let hasMore = true;
      const pagesPerRun = 1; // reduce por estabilidad y evitar timeouts
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const maxRetries = 3;
      let retries = 0;

      while (hasMore) {
        try {
          const { data, error } = await supabase.functions.invoke('shopify-import-products', {
            body: {
              shopDomain: integration.shop_domain,
              accessToken: integration.access_token_encrypted,
              userId: selectedUserId,
              pageInfo,
              pagesPerRun,
            },
          });

          if (error) throw error;

          const importedThisRun = Number(data?.count || 0);
          totalImported += importedThisRun;
          hasMore = Boolean(data?.hasMore);
          pageInfo = data?.nextPageInfo || null;

          toast({
            title: hasMore ? 'Importando productos…' : 'Último lote importado',
            description: `${importedThisRun} productos en este lote • Acumulado: ${totalImported}${hasMore ? ' • Continuando…' : ''}`,
          });

          // Reiniciar contador de reintentos al éxito
          retries = 0;

          // Pausa más larga para evitar límites de Shopify
          if (hasMore) {
            await sleep(1200);
          }
        } catch (err) {
          retries++;
          const msg = err instanceof Error ? err.message : 'Fallo de red o límite de tasa';
          if (retries <= maxRetries) {
            const wait = 1000 * Math.pow(2, retries - 1); // 1s, 2s, 4s
            toast({
              title: 'Reintentando importación…',
              description: `Intento ${retries}/${maxRetries} en ${wait / 1000}s • ${msg}`,
            });
            await sleep(wait);
            continue; // reintentar misma página
          }
          throw err; // sin más reintentos
        }
      }

      toast({
        title: '✅ Importación finalizada',
        description: `${totalImported} productos importados en total`,
      });
    } catch (error) {
      console.error('Error importing products:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al importar productos',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      setImportStep(null);
    }
  };

  const handleDisconnect = async () => {
    if (!integration || !selectedUserId) return;

    try {
      const { error } = await supabase
        .from('shopify_integrations')
        .update({ is_active: false })
        .eq('id', integration.id);

      if (error) throw error;

      toast({
        title: "Desconectado",
        description: "Integración de Shopify desactivada",
      });

      refetchIntegration();
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Error",
        description: "Error al desconectar",
        variant: "destructive"
      });
    }
  };

  if (selectedUserId) {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a usuarios
          </Button>
          <h2 className="text-2xl font-bold">
            Shopify para {selectedUser?.business_name || selectedUser?.email}
          </h2>
        </div>

        {integration ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Shopify Conectado
                  </CardTitle>
                  <CardDescription>
                    Dominio: {integration.shop_domain}
                  </CardDescription>
                </div>
                <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                  Desconectar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleImportOrders}
                  disabled={isImporting}
                  className="w-full"
                >
                  {isImporting && importStep === 'orders' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Órdenes
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleImportProducts}
                  disabled={isImporting}
                  className="w-full"
                >
                  {isImporting && importStep === 'products' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Productos
                    </>
                  )}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Última sincronización: {integration.last_sync_at ? new Date(integration.last_sync_at).toLocaleString('es-ES') : 'Nunca'}</p>
                <p>Estado: <Badge>{integration.connection_status}</Badge></p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-amber-500" />
                Configurar Integración de Shopify
              </CardTitle>
              <CardDescription>
                Configura la tienda Shopify para este usuario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopDomain">Dominio de la tienda</Label>
                <Input
                  id="shopDomain"
                  placeholder="mi-tienda.myshopify.com"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessToken">Token de acceso</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="shpat_..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>

              <Button
                onClick={handleValidateAndSave}
                disabled={isValidating || !shopDomain || !accessToken}
                className="w-full"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  'Validar y Guardar'
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Gestión de Integraciones Shopify
        </CardTitle>
        <CardDescription>
          Selecciona un usuario para configurar o gestionar su integración con Shopify
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Negocio</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Shopify</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userDetails?.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.business_name || 'No configurado'}</TableCell>
                <TableCell>
                  <Badge variant={user.subscription_plan === 'free' ? 'secondary' : 'default'}>
                    {user.subscription_plan}
                  </Badge>
                </TableCell>
                <TableCell>
                  {usersWithShopify?.has(user.user_id) ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">
                        {usersWithShopify.get(user.user_id)?.shop_domain}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-muted-foreground">No conectado</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUserId(user.user_id)}
                  >
                    <Store className="h-4 w-4 mr-2" />
                    Gestionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
