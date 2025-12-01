import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AIUsageWarnings } from '@/components/settings/AIUsageWarnings';
import { 
  Crown, 
  Package, 
  MessageSquare, 
  CreditCard, 
  Settings as SettingsIcon,
  ExternalLink,
  Loader2,
  Check,
  X
} from 'lucide-react';

interface PlanInfo {
  plan_id: string;
  plan_name: string;
  max_products: number;
  max_ai_messages: number;
  extra_message_cost?: number;
  subscription_status: string;
  subscription_end?: string;
}

interface UsageInfo {
  ai_messages_used: number;
  extra_messages_purchased: number;
  products_count: number;
}

interface UsageLimits {
  can_add_products: boolean;
  can_send_ai_messages: boolean;
  products_remaining: number;
  ai_messages_remaining: number;
  pending_charge?: {
    amount: number;
    threshold: number;
    percentage: number;
  };
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { usageLimits: limits, getUsagePercentage, isBlocked } = useUsageLimits();
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
 
   const [availablePlans, setAvailablePlans] = useState<Array<{
    id: string; name: string; price: string; period: string; features: string[]; popular: boolean;
  }>>([
    {
      id: 'free',
      name: 'Gratis',
      price: '$0',
      period: '/mes',
      features: ['20 productos', '100 mensajes IA', 'Funciones básicas'],
      popular: false
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '$29',
      period: '/mes',
      features: ['100 productos', '1,500 mensajes IA', 'Mensajes extra: $0.004'],
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$49',
      period: '/mes',
      features: ['200 productos', '3,500 mensajes IA', 'Mensajes extra: $0.004'],
      popular: true
    },
    {
      id: 'business',
      name: 'Business',
      price: '$99',
      period: '/mes',
      features: ['500 productos', '7,500 mensajes IA', 'Integración Shopify', 'Soporte premium'],
      popular: false
    }
  ]);

  useEffect(() => {
    if (user) {
      fetchUsageInfo();
      fetchPlans();
    }
  }, [user]);

  const fetchUsageInfo = async () => {
    try {
      setLoading(true);
      
      // Obtener información de suscripción desde Stripe
      const { data: subscriptionData, error: subError } = await supabase.functions.invoke('check-subscription');
      
      if (subError) {
        console.error('Error checking subscription:', subError);
        // Usar plan gratuito por defecto en caso de error
        setPlanInfo({
          plan_id: 'free',
          plan_name: 'Gratis',
          max_products: 20,
          max_ai_messages: 100,
          subscription_status: 'free'
        });
      } else {
        // Obtener detalles del plan desde la base de datos
        const { data: planDetails } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('plan_id', subscriptionData.plan_id || 'free')
          .single();

        setPlanInfo({
          plan_id: subscriptionData.plan_id || 'free',
          plan_name: subscriptionData.plan_name || 'Gratis',
          max_products: planDetails?.max_products || 20,
          max_ai_messages: planDetails?.max_ai_messages || 100,
          subscription_status: subscriptionData.subscribed ? 'active' : 'free',
          subscription_end: subscriptionData.subscription_end
        });
      }
      
      // Obtener datos de uso actual
      const { data: usageData, error: usageError } = await supabase.functions.invoke('check-usage-limits');
      
      if (usageError) {
        console.error('Error fetching usage:', usageError);
        setUsageInfo({
          ai_messages_used: 0,
          extra_messages_purchased: 0,
          products_count: 0
        });
        setUsageLimits({
          can_add_products: true,
          can_send_ai_messages: true,
          products_remaining: 20,
          ai_messages_remaining: 100
        });
      } else {
        setUsageInfo(usageData.usage);
        setUsageLimits(usageData.limits);
      }
    } catch (error) {
      console.error('Error fetching usage info:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('plan_id, name, price_monthly, max_products, max_ai_messages, extra_message_cost')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching plans:', error);
        return;
      }

      const mapped = (data || []).map((p: any) => ({
        id: p.plan_id,
        name: p.name,
        price: `$${Number(p.price_monthly).toFixed(0)}`,
        period: '/mes',
        features: [
          `${p.max_products} productos`,
          `${Number(p.max_ai_messages).toLocaleString()} mensajes IA`,
          ...(p.extra_message_cost ? [`Mensajes extra: $${Number(p.extra_message_cost).toFixed(3)}`] : []),
        ],
        popular: p.plan_id === 'pro',
      }));

      mapped.sort((a: any, b: any) => Number(a.price.replace('$','')) - Number(b.price.replace('$','')));
      setAvailablePlans(mapped);
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };
 
   const handleUpgrade = async (planId: string) => {
     try {
       setLoadingPlan(planId);
       
       if (planId === 'free') {
         toast({
           title: "Plan Gratis",
           description: "Ya estás en el plan gratuito",
         });
         return;
       }
 
       const { data, error } = await supabase.functions.invoke('create-checkout', {
         body: { plan_id: planId }
       });
 
       if (error) {
         toast({
           title: "Error",
           description: "No se pudo crear la sesión de pago",
           variant: "destructive",
         });
         return;
       }
 
       if (data?.url) {
         window.open(data.url, '_blank');
       }
     } catch (error) {
       console.error('Error creating checkout:', error);
       toast({
         title: "Error",
         description: "No se pudo procesar la solicitud",
         variant: "destructive",
       });
     } finally {
       setLoadingPlan(null);
     }
   };

  const handleManageSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo acceder al portal de facturación",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error accessing customer portal:', error);
      toast({
        title: "Error",
        description: "No se pudo acceder al portal de facturación",
        variant: "destructive",
      });
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const getProductsProgress = () => {
    if (!usageInfo || !planInfo) return 0;
    return (usageInfo.products_count / planInfo.max_products) * 100;
  };

  const getMessagesProgress = () => {
    if (!usageInfo || !planInfo) return 0;
    const totalMessages = planInfo.max_ai_messages + (usageInfo.extra_messages_purchased || 0);
    return (usageInfo.ai_messages_used / totalMessages) * 100;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Configuración</h1>
        <p className="text-muted-foreground">Gestiona tu plan de suscripción y configuración de cuenta</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plan Actual */}
        <div className="lg:col-span-2 space-y-6">
          {/* Advertencias de uso */}
          {limits && (
            <AIUsageWarnings
              usagePercentage={getUsagePercentage()}
              messagesUsed={limits.ai_messages_used}
              messagesLimit={limits.max_ai_messages + limits.extra_messages_purchased}
              isBlocked={isBlocked()}
            />
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="h-6 w-6 text-primary" />
                  <CardTitle>Plan Actual</CardTitle>
                </div>
                {planInfo?.subscription_status !== 'free' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleManageSubscription}
                    disabled={subscriptionLoading}
                  >
                    {subscriptionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Gestionar Facturación
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge variant={planInfo?.plan_id === 'free' ? 'secondary' : 'default'} className="text-lg px-3 py-1">
                    {planInfo?.plan_name || 'Gratis'}
                  </Badge>
                  {planInfo?.subscription_status === 'active' && (
                    <Badge variant="outline" className="text-green-600">
                      <Check className="h-3 w-3 mr-1" />
                      Activo
                    </Badge>
                  )}
                </div>
                
                {planInfo?.subscription_end && (
                  <p className="text-sm text-muted-foreground">
                    Próxima renovación: {new Date(planInfo.subscription_end).toLocaleDateString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Uso Actual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <SettingsIcon className="h-6 w-6" />
                Uso Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Productos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">Productos</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {usageInfo?.products_count || 0} / {planInfo?.max_products || 0}
                  </span>
                </div>
                <Progress value={getProductsProgress()} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {usageLimits?.products_remaining || 0} productos restantes
                </p>
              </div>

              <Separator />

              {/* Mensajes IA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium">Mensajes IA</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {usageInfo?.ai_messages_used || 0} / {(planInfo?.max_ai_messages || 0) + (usageInfo?.extra_messages_purchased || 0)}
                  </span>
                </div>
                <Progress value={getMessagesProgress()} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {usageLimits?.ai_messages_remaining || 0} mensajes restantes este mes
                </p>
                
                {/* Información de mensajes adicionales */}
                {planInfo?.extra_message_cost && planInfo.extra_message_cost > 0 && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <CreditCard className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-medium">Mensajes Adicionales</p>
                        <p className="text-xs text-muted-foreground">
                          Cuando superes el límite, se cobrarán ${planInfo.extra_message_cost.toFixed(3)} por mensaje adicional.
                          El cargo se realiza automáticamente cada $5.00 acumulados.
                        </p>
                        {usageLimits?.pending_charge && usageLimits.pending_charge.amount > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Saldo pendiente:</span>
                              <span className="text-xs font-medium">${usageLimits.pending_charge.amount.toFixed(2)} / $5.00</span>
                            </div>
                            <Progress value={usageLimits.pending_charge.percentage} className="h-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Planes Disponibles */}
          <Card>
            <CardHeader>
              <CardTitle>Cambiar Plan</CardTitle>
              <CardDescription>
                Actualiza tu plan para obtener más productos y mensajes IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availablePlans.map((plan) => (
                  <Card 
                    key={plan.id} 
                    className={`relative ${
                      planInfo?.plan_id === plan.id ? 'ring-2 ring-primary' : ''
                    } ${plan.popular ? 'border-primary' : ''}`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2 left-4 bg-primary">
                        Más Popular
                      </Badge>
                    )}
                    {planInfo?.plan_id === plan.id && (
                      <Badge className="absolute -top-2 right-4 bg-green-600">
                        Plan Actual
                      </Badge>
                    )}
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground">{plan.period}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="text-sm flex items-center gap-2">
                            <Check className="h-3 w-3 text-green-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                       <Button 
                         className="w-full" 
                         variant={planInfo?.plan_id === plan.id ? 'outline' : 'default'}
                         disabled={planInfo?.plan_id === plan.id || loadingPlan === plan.id}
                         onClick={() => handleUpgrade(plan.id)}
                       >
                         {loadingPlan === plan.id ? (
                           <>
                             <Loader2 className="h-4 w-4 animate-spin mr-2" />
                             Procesando...
                           </>
                         ) : planInfo?.plan_id === plan.id ? (
                           'Plan Actual'
                         ) : plan.id === 'free' ? (
                           'Cambiar a Gratis'
                         ) : (
                           `Actualizar a ${plan.name}`
                         )}
                       </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información de la Cuenta */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID de Usuario</label>
                <p className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  {user?.id}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Miembro desde</label>
                <p className="text-sm">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enlaces Útiles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-between" asChild>
                <a href="/store" className="flex items-center">
                  <span>Configurar Tienda</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <a href="/products" className="flex items-center">
                  <span>Gestionar Productos</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <a href="/chats" className="flex items-center">
                  <span>WhatsApp & AI Agent</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;