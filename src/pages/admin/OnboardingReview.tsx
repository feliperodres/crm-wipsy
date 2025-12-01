import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AdminRoute } from '@/components/auth/AdminRoute';

interface UserOnboardingStatus {
  user_id: string;
  email: string;
  business_name: string;
  onboarding_completed: boolean;
  onboarding_current_step: number;
  ai_agent_mode: string;
  created_at: string;
  whatsapp_connected: boolean;
  shopify_connected: boolean;
  has_shipping_rates: boolean;
}

export default function OnboardingReview() {
  const [users, setUsers] = useState<UserOnboardingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Obtener usuarios con sus perfiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (!profiles) {
        setUsers([]);
        return;
      }

      // Para cada usuario, verificar conexiones
      const usersWithStatus = await Promise.all(
        profiles.map(async (profile) => {
          // Verificar WhatsApp
          const { data: whatsappData } = await supabase
            .from('whatsapp_meta_credentials')
            .select('id')
            .eq('user_id', profile.user_id)
            .eq('status', 'active')
            .maybeSingle();

          // Verificar Shopify
          const { data: shopifyData } = await supabase
            .from('shopify_integrations')
            .select('id')
            .eq('user_id', profile.user_id)
            .eq('is_active', true)
            .maybeSingle();

          // Verificar tarifas de envío
          const { data: storeData } = await supabase
            .from('store_settings')
            .select('shipping_rates')
            .eq('user_id', profile.user_id)
            .maybeSingle();

          // Obtener email desde auth.users
          const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);

          return {
            user_id: profile.user_id,
            email: userData.user?.email || 'N/A',
            business_name: profile.business_name || 'Sin nombre',
            onboarding_completed: profile.onboarding_completed || false,
            onboarding_current_step: profile.onboarding_current_step || 0,
            ai_agent_mode: profile.ai_agent_mode || 'N/A',
            created_at: profile.created_at,
            whatsapp_connected: !!whatsappData,
            shopify_connected: !!shopifyData,
            has_shipping_rates: !!storeData?.shipping_rates && (storeData.shipping_rates as any[]).length > 0
          };
        })
      );

      setUsers(usersWithStatus);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.business_name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    completed: users.filter(u => u.onboarding_completed).length,
    inProgress: users.filter(u => !u.onboarding_completed && u.onboarding_current_step > 0).length,
    notStarted: users.filter(u => u.onboarding_current_step === 0).length
  };

  return (
    <AdminRoute>
      <DashboardLayout>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8" />
              Revisión de Onboarding
            </h1>
            <p className="text-muted-foreground mt-2">
              Estado de configuración de usuarios
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Usuarios</p>
                    <p className="text-3xl font-bold">{stats.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completados</p>
                    <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">En Progreso</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sin Empezar</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.notStarted}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email o negocio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={loadUsers} variant="outline">
              Actualizar
            </Button>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Usuarios ({filteredUsers.length})</CardTitle>
              <CardDescription>
                Estado detallado del onboarding de cada usuario
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron usuarios
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div key={user.user_id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{user.business_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Badge variant={user.onboarding_completed ? 'default' : 'secondary'}>
                          {user.onboarding_completed ? 'Completado' : `Paso ${user.onboarding_current_step}/5`}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${user.whatsapp_connected ? 'bg-green-500' : 'bg-gray-300'}`} />
                          WhatsApp
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${user.shopify_connected ? 'bg-green-500' : 'bg-gray-300'}`} />
                          Shopify
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${user.ai_agent_mode !== 'N/A' ? 'bg-green-500' : 'bg-gray-300'}`} />
                          Agente: {user.ai_agent_mode}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${user.has_shipping_rates ? 'bg-green-500' : 'bg-gray-300'}`} />
                          Tarifas
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Creado: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AdminRoute>
  );
}
