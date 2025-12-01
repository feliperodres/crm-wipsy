import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Edit, Package, MessageSquare, DollarSign, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface UserPlansTableProps {
  userDetails: any[] | undefined;
  toast: any;
}

interface UserUsage {
  ai_messages_used: number;
  products_count: number;
  max_ai_messages: number;
  max_products: number;
  extra_messages_purchased: number;
  pending_charge_amount: number;
}

const plans = [
  { id: 'free', name: 'Gratis', max_products: 20, max_ai_messages: 100 },
  { id: 'starter', name: 'Starter', max_products: 30, max_ai_messages: 500 },
  { id: 'pro', name: 'Pro', max_products: 200, max_ai_messages: 3500 },
  { id: 'business', name: 'Business', max_products: 500, max_ai_messages: 7500 }
];

export const UserPlansTable = ({ userDetails, toast }: UserPlansTableProps) => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPlanId, setNewPlanId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [usageLoading, setUsageLoading] = useState<string | null>(null);
  const [userUsages, setUserUsages] = useState<Record<string, UserUsage>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Cargar uso automáticamente al montar el componente
  React.useEffect(() => {
    if (userDetails && userDetails.length > 0) {
      // Cargar el uso para todos los usuarios automáticamente
      userDetails.forEach(user => {
        if (!userUsages[user.user_id]) {
          loadUserUsage(user.user_id);
        }
      });
    }
  }, [userDetails]);

  const handleSyncStripeSubscriptions = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-subscriptions');
      
      if (error) throw error;
      
      toast({
        title: "✅ Sincronización completada",
        description: `${data.syncedCount} suscripciones sincronizadas de ${data.totalUsers} usuarios`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['admin-user-details'] });
      
      // Recargar la página para ver los cambios
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error syncing subscriptions:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al sincronizar suscripciones",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const loadUserUsage = async (userId: string) => {
    if (userUsages[userId]) return; // Ya está cargado
    
    setUsageLoading(userId);
    try {
      // Obtener el plan actual
      const { data: planData } = await supabase.rpc('get_user_current_plan', {
        target_user_id: userId
      });

      // Obtener el uso actual
      const { data: usageData } = await supabase.rpc('get_user_current_usage', {
        target_user_id: userId
      });

      // Obtener el pending charge
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      const { data: counterData } = await supabase
        .from('usage_counters')
        .select('pending_charge_amount')
        .eq('user_id', userId)
        .eq('year', year)
        .eq('month', month)
        .single();

      const plan = planData?.[0] || { max_ai_messages: 100, max_products: 20 };
      const usage = usageData?.[0] || { ai_messages_used: 0, products_count: 0, extra_messages_purchased: 0 };

      setUserUsages(prev => ({
        ...prev,
        [userId]: {
          ai_messages_used: usage.ai_messages_used || 0,
          products_count: usage.products_count || 0,
          max_ai_messages: plan.max_ai_messages || 100,
          max_products: plan.max_products || 20,
          extra_messages_purchased: usage.extra_messages_purchased || 0,
          pending_charge_amount: counterData?.pending_charge_amount || 0
        }
      }));
    } catch (error) {
      console.error('Error loading user usage:', error);
    } finally {
      setUsageLoading(null);
    }
  };

  const handleOpenDialog = (user: any) => {
    setSelectedUser(user);
    setNewPlanId(user.subscription_plan || 'free');
    loadUserUsage(user.user_id);
  };

  const handleChangePlan = async () => {
    if (!selectedUser || !newPlanId) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-update-user-plan', {
        body: {
          target_user_id: selectedUser.user_id,
          new_plan_id: newPlanId
        }
      });

      if (error) throw error;

      toast({
        title: "Plan actualizado",
        description: `El plan de ${selectedUser.email} ha sido actualizado exitosamente`,
      });

      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ['admin-user-details'] });
      setSelectedUser(null);
    } catch (error) {
      console.error('Error changing plan:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al cambiar el plan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getMessagesProgress = (usage: UserUsage) => {
    const total = usage.max_ai_messages + usage.extra_messages_purchased;
    return Math.min(100, (usage.ai_messages_used / total) * 100);
  };

  const getProductsProgress = (usage: UserUsage) => {
    return Math.min(100, (usage.products_count / usage.max_products) * 100);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Planes de Usuario y Uso</CardTitle>
              <CardDescription>
                Gestión de suscripciones y consumo de recursos por usuario
              </CardDescription>
            </div>
            <Button 
              onClick={handleSyncStripeSubscriptions}
              disabled={isSyncing}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              size="sm"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  🔄 Sincronizar Stripe
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Negocio</TableHead>
            <TableHead>Plan Actual</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead>Mensajes IA</TableHead>
            <TableHead>Saldo Pendiente</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userDetails?.map((user: any) => {
            const usage = userUsages[user.user_id];
            const isLoadingUsage = usageLoading === user.user_id;

            return (
              <TableRow key={user.user_id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.business_name || 'No configurado'}</TableCell>
                <TableCell>
                  <Badge variant={user.subscription_plan === 'free' ? 'secondary' : 'default'}>
                    {user.subscription_plan}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isLoadingUsage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : usage ? (
                    <div className="space-y-1 min-w-[120px]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {usage.products_count} / {usage.max_products}
                        </span>
                      </div>
                      <Progress value={getProductsProgress(usage)} className="h-1" />
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadUserUsage(user.user_id)}
                    >
                      Ver uso
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  {isLoadingUsage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : usage ? (
                    <div className="space-y-1 min-w-[140px]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {usage.ai_messages_used} / {usage.max_ai_messages + usage.extra_messages_purchased}
                        </span>
                      </div>
                      <Progress value={getMessagesProgress(usage)} className="h-1" />
                      {usage.extra_messages_purchased > 0 && (
                        <span className="text-xs text-muted-foreground">
                          +{usage.extra_messages_purchased} extras
                        </span>
                      )}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  {usage && usage.pending_charge_amount > 0 ? (
                    <div className="flex items-center gap-1 text-xs">
                      <DollarSign className="h-3 w-3 text-amber-500" />
                      <span className="font-medium">${usage.pending_charge_amount.toFixed(2)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(user)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Cambiar Plan
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Plan de Usuario</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo plan para {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Plan Actual</label>
              <Badge variant="outline" className="w-full justify-center py-2">
                {selectedUser?.subscription_plan}
              </Badge>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nuevo Plan</label>
              <Select value={newPlanId} onValueChange={setNewPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.max_products} productos / {plan.max_ai_messages.toLocaleString()} mensajes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {userUsages[selectedUser?.user_id] && (
              <div className="space-y-3 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Uso Actual:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Productos:</span>
                    <span className="font-medium">
                      {userUsages[selectedUser.user_id].products_count} / {userUsages[selectedUser.user_id].max_products}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mensajes IA:</span>
                    <span className="font-medium">
                      {userUsages[selectedUser.user_id].ai_messages_used} / {userUsages[selectedUser.user_id].max_ai_messages + userUsages[selectedUser.user_id].extra_messages_purchased}
                    </span>
                  </div>
                  {userUsages[selectedUser.user_id].pending_charge_amount > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Saldo pendiente:</span>
                      <span className="font-medium">
                        ${userUsages[selectedUser.user_id].pending_charge_amount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleChangePlan} disabled={loading || newPlanId === selectedUser?.subscription_plan}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Actualizando...
                </>
              ) : (
                'Cambiar Plan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
