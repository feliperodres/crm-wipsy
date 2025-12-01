import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users, MessageSquare, ShoppingCart, DollarSign, Eye, ImageIcon, Database, CreditCard, Edit, Calendar, Upload, Palette } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { AdminChatView } from '@/components/admin/AdminChatView';
import { UserPlansTable } from '@/components/admin/UserPlansTable';
import { WhatsAppCredentialsManager } from '@/components/admin/WhatsAppCredentialsManager';
import { AdminShopifyManager } from '@/components/admin/AdminShopifyManager';
import { DemoBookingsManager } from '@/components/admin/DemoBookingsManager';
import { AdminBulkImageUploader } from '@/components/admin/AdminBulkImageUploader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Lista de emails de administradores
  const adminEmails = [
    'felipe.rodres@gmail.com',
    'admin@wipsy.com',
    // Agrega aquí los emails de los administradores
  ];
  
  const isAdmin = user?.email && adminEmails.includes(user.email);
  const [isGeneratingBulkEmbeddings, setIsGeneratingBulkEmbeddings] = useState(false);
  const [isGeneratingProductEmbeddings, setIsGeneratingProductEmbeddings] = useState(false);
  const [embeddingsTargetUserId, setEmbeddingsTargetUserId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState<any>(null);
  const [lastBatchResult, setLastBatchResult] = useState<any>(null);
  const [landingTheme, setLandingTheme] = useState<'dark' | 'light'>('dark');

  // Fetch landing theme
  useQuery({
    queryKey: ['landing-theme'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('app_settings').select('value').eq('key', 'landing_theme').maybeSingle();
      if (data?.value) setLandingTheme(data.value as 'dark' | 'light');
      return data;
    },
    enabled: isAdmin
  });

  const toggleLandingTheme = async (checked: boolean) => {
    const newTheme = checked ? 'light' : 'dark';
    setLandingTheme(newTheme);
    
    try {
      const { error } = await (supabase as any).from('app_settings').upsert({
        key: 'landing_theme',
        value: newTheme
      });
      
      if (error) throw error;
      
      toast({
        title: "Tema actualizado",
        description: `La landing page ahora está en modo ${newTheme === 'light' ? 'Claro' : 'Oscuro'}`,
      });
    } catch (error) {
      console.error('Error updating theme:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el tema",
        variant: "destructive"
      });
    }
  };

  // Consultar datos reales de usuarios
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      // Obtener estadísticas básicas
      const [
        { count: totalUsers },
        { count: totalAiMessages },
        { count: totalOrders },
        { data: revenueData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('sender_type', 'agent'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total').gte('created_at', '2024-01-01')
      ]);

      const totalRevenue = revenueData?.reduce((sum, order) => sum + (Number(order.total) || 0), 0) || 0;

      return {
        total_users: totalUsers || 0,
        total_ai_messages: totalAiMessages || 0,
        total_orders: totalOrders || 0,
        total_revenue: totalRevenue
      };
    },
    enabled: isAdmin,
  });

  const { data: userDetails, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['admin-user-details'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_user_details');
      if (error) throw error;
      return (data || []).sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: isAdmin,
  });

  // Query para obtener todos los chats de todos los usuarios con información de pedidos
  const { data: allChats, isLoading: allChatsLoading } = useQuery({
    queryKey: ['admin-all-chats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_all_conversations_with_orders');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Query para obtener chats de un usuario específico
  const { data: userChats, isLoading: chatsLoading } = useQuery({
    queryKey: ['admin-user-chats', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      
      const { data, error } = await supabase.rpc('get_admin_user_conversations', {
        target_user_id: selectedUserId
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUserId && isAdmin,
  });

  const processBatch = async (selectedUserIds?: string[], offset: number = 0) => {
    if (!user?.id) return null;
    
    try {
      const { data, error } = await supabase.functions.invoke('bulk-generate-image-embeddings', {
        body: { 
          adminUserId: user.id,
          selectedUserIds: selectedUserIds || [],
          batchSize: 1,
          offset
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error processing batch:', error);
      throw error;
    }
  };

  const handleBulkGenerateImageEmbeddings = async (selectedUserIds?: string[]) => {
    if (!user?.id) return;
    
    setIsGeneratingBulkEmbeddings(true);
    setBatchProgress(null);
    setLastBatchResult(null);
    
    let offset = 0;
    let totalProcessed = 0;
    let totalErrors = 0;
    let batchNumber = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        setBatchProgress({
          currentBatch: batchNumber,
          processing: true,
          message: `Procesando lote ${batchNumber}...`
        });

        const result = await processBatch(selectedUserIds, offset);
        
        if (!result) break;
        
        totalProcessed += result.totalImagesProcessed || 0;
        totalErrors += result.totalErrors || 0;
        
        setBatchProgress({
          currentBatch: batchNumber,
          processing: false,
          result: result,
          totalProcessed,
          totalErrors,
          message: result.message
        });

        setLastBatchResult(result);
        
        hasMore = result.batchInfo?.hasMore || false;
        offset = result.batchInfo?.nextOffset || 0;
        batchNumber++;

        // Pequeña pausa entre lotes
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast({
        title: "Procesamiento completado",
        description: `Total: ${totalProcessed} imágenes procesadas, ${totalErrors} errores`,
      });
      
    } catch (error) {
      console.error('❌ Error in bulk processing:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error procesando imágenes",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingBulkEmbeddings(false);
      setBatchProgress(null);
    }
  };

  const handleRetryFromLastBatch = async (selectedUserIds?: string[]) => {
    if (!lastBatchResult?.batchInfo?.nextOffset) {
      toast({
        title: "Error",
        description: "No hay lote anterior desde donde continuar",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingBulkEmbeddings(true);
    setBatchProgress(null);
    
    let offset = lastBatchResult.batchInfo.nextOffset;
    let totalProcessed = 0;
    let totalErrors = 0;
    let batchNumber = lastBatchResult.batchInfo.currentBatch + 1;
    let hasMore = true;

    try {
      while (hasMore) {
        setBatchProgress({
          currentBatch: batchNumber,
          processing: true,
          message: `Reintentando desde lote ${batchNumber}...`
        });

        const result = await processBatch(selectedUserIds, offset);
        
        if (!result) break;
        
        totalProcessed += result.totalImagesProcessed || 0;
        totalErrors += result.totalErrors || 0;
        
        setBatchProgress({
          currentBatch: batchNumber,
          processing: false,
          result: result,
          totalProcessed,
          totalErrors,
          message: result.message
        });

        setLastBatchResult(result);
        
        hasMore = result.batchInfo?.hasMore || false;
        offset = result.batchInfo?.nextOffset || 0;
        batchNumber++;

        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast({
        title: "Reintento completado",
        description: `Total: ${totalProcessed} imágenes procesadas, ${totalErrors} errores`,
      });
      
    } catch (error) {
      console.error('❌ Error in retry:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error reintentando",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingBulkEmbeddings(false);
      setBatchProgress(null);
    }
  };

  const handleRetryImage = async (productId: string, userId: string, imageUrl: string, productName?: string) => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke('bulk-generate-image-embeddings', {
        body: { adminUserId: user.id, retry: { productId, userId, imageUrl, productName } }
      });
      if (error) throw error;
      toast({ title: 'Reintento enviado', description: data?.message || 'Imagen reintentada' });
    } catch (e) {
      console.error('❌ Retry error', e);
      toast({ title: 'Error al reintentar', description: e instanceof Error ? e.message : 'Fallo reintento', variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos de administrador para acceder a esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Función para ver chats de un usuario
  const handleViewChats = (userId: string, email: string, businessName: string) => {
    setSelectedUserId(userId);
    setSelectedChatId(null);
  };

  // Función para ver un chat específico
  const handleViewSpecificChat = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  // Función para volver a la lista de usuarios
  const handleBackToUsers = () => {
    setSelectedUserId(null);
    setSelectedChatId(null);
  };

  // Función para volver a la lista de chats
  const handleBackToChats = () => {
    setSelectedChatId(null);
  };

  // Si estamos viendo un chat específico
  if (selectedChatId) {
    return (
      <div className="min-h-screen bg-background">
        <AdminChatView chatId={selectedChatId} onBack={handleBackToChats} />
      </div>
    );
  }

  // Si estamos viendo la lista de chats de un usuario
  if (selectedUserId) {
    const selectedUser = (userDetails as any[])?.find((u: any) => u.user_id === selectedUserId);
    
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={handleBackToUsers}
              className="mb-4"
            >
              ← Volver a usuarios
            </Button>
            <h1 className="text-3xl font-bold">
              Chats de {selectedUser?.business_name || selectedUser?.email}
            </h1>
            <p className="text-muted-foreground">
              Conversaciones del usuario {selectedUser?.email}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Conversaciones</CardTitle>
              <CardDescription>
                Todas las conversaciones de este usuario
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chatsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    </div>
                  ))}
                </div>
              ) : userChats?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Este usuario no tiene conversaciones.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Último mensaje</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>No leídos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                   <TableBody>
                     {userChats?.map((chat: any) => (
                       <TableRow key={chat.chat_id}>
                         <TableCell className="font-medium">{chat.customer_name}</TableCell>
                         <TableCell>{chat.customer_phone}</TableCell>
                         <TableCell className="max-w-xs truncate">
                           <div className="flex items-center gap-2">
                             {chat.has_images && (
                               <ImageIcon className="h-3 w-3 text-blue-500" />
                             )}
                             {chat.last_message || 'Sin mensajes'}
                           </div>
                         </TableCell>
                         <TableCell>
                           {chat.last_message_at ? 
                             new Date(chat.last_message_at).toLocaleString('es-ES') : 
                             'N/A'
                           }
                         </TableCell>
                         <TableCell>
                           {chat.unread_count > 0 && (
                             <Badge variant="destructive">
                               {chat.unread_count}
                             </Badge>
                           )}
                         </TableCell>
                         <TableCell>
                           <Badge variant={chat.status === 'active' ? 'default' : 'secondary'}>
                             {chat.status}
                           </Badge>
                         </TableCell>
                         <TableCell>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleViewSpecificChat(chat.chat_id)}
                           >
                             <Eye className="h-4 w-4 mr-1" />
                             Ver Chat
                           </Button>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">Monitor del sistema y análisis de usuarios</p>
        </div>

        {/* Stats Overview */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-muted rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Usuarios Totales</p>
                    <p className="text-2xl font-bold">{dashboardStats?.total_users || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mensajes AI</p>
                    <p className="text-2xl font-bold">{dashboardStats?.total_ai_messages || 0}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Órdenes Totales</p>
                    <p className="text-2xl font-bold">{dashboardStats?.total_orders || 0}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Revenue Total</p>
                    <p className="text-2xl font-bold">${dashboardStats?.total_revenue || 0}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="users" className="font-semibold">
              <Users className="h-4 w-4 mr-2" />
              Usuarios y Chats
            </TabsTrigger>
            <TabsTrigger value="chats">
              <MessageSquare className="h-4 w-4 mr-2" />
              Todos los Chats
            </TabsTrigger>
            <TabsTrigger value="demos">
              <Calendar className="h-4 w-4 mr-2" />
              Demos
            </TabsTrigger>
            <TabsTrigger value="planes">
              <CreditCard className="h-4 w-4 mr-2" />
              Gestión de Planes
            </TabsTrigger>
            <TabsTrigger value="shopify">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Shopify
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="images">
              <Upload className="h-4 w-4 mr-2" />
              Imágenes
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuarios de la Plataforma
                </CardTitle>
                <CardDescription>
                  Lista completa de usuarios - Haz clic en "Ver Chats" para acceder a las conversaciones de cada usuario
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-full mb-2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead className="w-12">
                            <Checkbox
                              checked={selectedUsers.length === userDetails?.length && userDetails?.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers(userDetails?.map(user => user.user_id) || []);
                                } else {
                                  setSelectedUsers([]);
                                }
                              }}
                            />
                         </TableHead>
                         <TableHead>Email</TableHead>
                         <TableHead>Negocio</TableHead>
                         <TableHead>Chats</TableHead>
                         <TableHead>Mensajes AI</TableHead>
                         <TableHead>Órdenes</TableHead>
                         <TableHead>Plan</TableHead>
                         <TableHead>Estado</TableHead>
                         <TableHead>Acciones</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {(userDetails as any[])?.map((user: any, index: number) => (
                         <TableRow key={user.user_id}>
                           <TableCell>
              <Checkbox
                checked={selectedUsers.includes(user.user_id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedUsers([...selectedUsers, user.user_id]);
                  } else {
                    setSelectedUsers(selectedUsers.filter(id => id !== user.user_id));
                  }
                }}
              />
                           </TableCell>
                           <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.business_name || 'No configurado'}</TableCell>
                          <TableCell>{user.total_chats}</TableCell>
                          <TableCell>{user.total_ai_messages}</TableCell>
                          <TableCell>{user.total_orders}</TableCell>
                          <TableCell>
                            <Badge variant={user.subscription_plan === 'free' ? 'secondary' : 'default'}>
                              {user.subscription_plan}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.subscription_status === 'active' ? 'default' : 'secondary'}>
                              {user.subscription_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                             <Button
                               variant="default"
                               size="sm"
                               onClick={() => handleViewChats(user.user_id, user.email, user.business_name || '')}
                               className="flex items-center gap-2"
                             >
                               <MessageSquare className="h-4 w-4" />
                               Ver Chats ({user.total_chats})
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chats">
            <Card>
              <CardHeader>
                <CardTitle>Todas las Conversaciones</CardTitle>
                <CardDescription>
                  Lista completa de conversaciones de todos los usuarios - Haz clic en "Ver Usuario" para filtrar por cuenta
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allChatsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-full mb-2"></div>
                      </div>
                    ))}
                  </div>
                ) : allChats?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No hay conversaciones en el sistema.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Negocio</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Último mensaje</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Pedidos</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allChats?.map((chat: any) => (
                        <TableRow key={chat.chat_id}>
                          <TableCell className="font-medium">{chat.user_email}</TableCell>
                          <TableCell>{chat.business_name || 'No configurado'}</TableCell>
                          <TableCell>{chat.customer_name}</TableCell>
                          <TableCell>{chat.customer_phone}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            <div className="flex items-center gap-2">
                              {chat.has_images && (
                                <ImageIcon className="h-3 w-3 text-blue-500" />
                              )}
                              {chat.last_message || 'Sin mensajes'}
                              {chat.unread_count > 0 && (
                                <Badge variant="destructive" className="ml-1">
                                  {chat.unread_count}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {chat.last_message_at ? 
                              new Date(chat.last_message_at).toLocaleString('es-ES') : 
                              'N/A'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {chat.has_order ? (
                                <div className="flex flex-col gap-1">
                                  <Badge variant="default" className="bg-green-600">
                                    <ShoppingCart className="h-3 w-3 mr-1" />
                                    {chat.order_count} {chat.order_count === 1 ? 'pedido' : 'pedidos'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    ${Number(chat.total_order_value || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                                  </span>
                                </div>
                              ) : (
                                <Badge variant="secondary">Sin pedidos</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={chat.status === 'active' ? 'default' : 'secondary'}>
                              {chat.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewChats(chat.user_id, chat.user_email, chat.business_name)}
                              >
                                Ver Usuario
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewSpecificChat(chat.chat_id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Chat
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demos">
            <DemoBookingsManager />
          </TabsContent>

          <TabsContent value="planes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Gestión de Planes de Usuarios
                </CardTitle>
                <CardDescription>
                  Visualiza el consumo y cambia los planes de los usuarios manualmente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserPlansTable userDetails={userDetails} toast={toast} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics del Sistema</CardTitle>
                <CardDescription>
                  Métricas y análisis avanzados del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Analytics avanzados próximamente...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Apariencia de Landing Page
                  </CardTitle>
                  <CardDescription>
                    Controla el tema visual de la página principal (público)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <Switch
                      id="landing-theme"
                      checked={landingTheme === 'light'}
                      onCheckedChange={toggleLandingTheme}
                    />
                    <Label htmlFor="landing-theme">
                      Activar Modo Claro (Light Mode)
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Estado actual: <strong>{landingTheme === 'light' ? 'Claro' : 'Oscuro'}</strong>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estado del Sistema</CardTitle>
                  <CardDescription>
                    Configuración y estado del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Herramientas de administración del sistema.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Procesamiento Masivo de Imágenes
                  </CardTitle>
                  <CardDescription>
                    Generar embeddings vectoriales para todas las imágenes de productos existentes en la plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      🔍 Sistema de Búsqueda por Imágenes
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                      Esta función procesará todas las imágenes de productos existentes para crear embeddings vectoriales que permiten:
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 ml-4">
                      <li>• Búsquedas por similitud visual</li>
                      <li>• Recomendaciones automáticas de productos</li>
                      <li>• Análisis visual de inventario</li>
                      <li>• Detección de productos duplicados</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                      ⚠️ <strong>Importante:</strong> Esta operación puede tomar tiempo considerable
                    </p>
                    <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 ml-4">
                      <li>• Procesa imágenes de usuarios seleccionados o todos</li>
                      <li>• Duración estimada: 5-15 segundos por imagen</li>
                      <li>• Se ejecuta en segundo plano</li>
                      <li>• Puedes cerrar esta página y continuará procesando</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      onClick={() => handleBulkGenerateImageEmbeddings()}
                      disabled={isGeneratingBulkEmbeddings}
                      className="w-full flex items-center justify-center gap-2 h-12 text-base font-semibold"
                      size="lg"
                      variant={isGeneratingBulkEmbeddings ? "secondary" : "default"}
                    >
                      {isGeneratingBulkEmbeddings ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Procesando imágenes de productos...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-5 w-5" />
                          🚀 Procesar TODAS las Imágenes de Productos
                        </>
                      )}
                    </Button>

                    <Button 
                      onClick={() => {
                        console.log('🔍 Button clicked - Processing selected users');
                        console.log('Selected user indices:', selectedUsers);
                        console.log('User details:', userDetails);
                        
                        const selectedIds = selectedUsers;
                        console.log('Selected user IDs:', selectedIds);
                        
                        if (selectedIds.length === 0) {
                          console.log('❌ No users selected');
                          toast({
                            title: "Error",
                            description: "Selecciona al menos un usuario",
                            variant: "destructive"
                          });
                          return;
                        }
                        console.log('✅ Starting processing for selected users:', selectedIds);
                        handleBulkGenerateImageEmbeddings(selectedUsers);
                      }}
                      disabled={isGeneratingBulkEmbeddings || selectedUsers.length === 0}
                      className="w-full flex items-center justify-center gap-2 h-10"
                      variant="outline"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Procesar Solo Usuarios Seleccionados ({selectedUsers.length})
                    </Button>
                  </div>

                  {isGeneratingBulkEmbeddings && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
                        ⏳ Procesando en segundo plano... Revisa los logs de la función para ver el progreso.
                      </p>
                    </div>
                  )}

                  {lastBatchResult && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {lastBatchResult.message}
                        </p>
                        {lastBatchResult.batchInfo?.hasMore && (
                          <Button size="sm" variant="outline" onClick={() => handleRetryFromLastBatch(selectedUsers)}>
                            Continuar siguiente lote
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {lastBatchResult.productResults?.map((p: any) => (
                          <div key={p.productId} className="p-3 rounded-md border">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-semibold">{p.productName}</p>
                                <p className="text-xs text-muted-foreground">Imágenes: {p.successfulImages}/{p.totalImages} ok</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {p.imageResults?.map((img: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <span>{img.status === 'success' ? '✅' : '❌'}</span>
                                    <span className="truncate max-w-[480px]">{img.imageUrl}</span>
                                  </div>
                                  {img.status === 'error' && (
                                    <Button size="sm" variant="outline" onClick={() => handleRetryImage(p.productId, p.userId, img.imageUrl, p.productName)}>
                                      Reintentar
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Generación de Embeddings de Productos (Texto)
                  </CardTitle>
                  <CardDescription>
                    Generar embeddings vectoriales de texto para productos (nombre, descripción, categorías)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                      🔍 Sistema de Búsqueda Semántica
                    </h4>
                    <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                      Genera embeddings de texto para permitir búsquedas inteligentes por:
                    </p>
                    <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1 ml-4">
                      <li>• Nombre y descripción del producto</li>
                      <li>• Categorías y variantes</li>
                      <li>• Búsqueda semántica ("camiseta azul grande")</li>
                      <li>• Recomendaciones basadas en texto</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                      ⚠️ <strong>Límite:</strong> Por límites de tiempo de ejecución, se procesan máximo 500 productos por ejecución
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Si tienes más de 500 productos activos, ejecuta esta función varias veces hasta procesar todos.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Seleccionar Usuario</label>
                      <Select value={embeddingsTargetUserId} onValueChange={setEmbeddingsTargetUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un usuario..." />
                        </SelectTrigger>
                        <SelectContent>
                          {userDetails?.map((u: any) => (
                            <SelectItem key={u.user_id} value={u.user_id}>
                              {u.business_name || u.email} - {u.total_chats} chats
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={async () => {
                        if (!embeddingsTargetUserId) {
                          toast({
                            title: "Error",
                            description: "Selecciona un usuario primero",
                            variant: "destructive"
                          });
                          return;
                        }

                        setIsGeneratingProductEmbeddings(true);
                        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
                        let offset = 0;
                        const pageSize = 200; // ajustable
                        let totalProcessed = 0;
                        let hasMore = true;
                        let run = 1;
                        const maxRetries = 3;
                        let retries = 0;

                        try {
                          while (hasMore) {
                            try {
                              const { data, error } = await supabase.functions.invoke('generate-product-embeddings', {
                                body: { userId: embeddingsTargetUserId, offset, pageSize, reset: offset === 0 }
                              });
                              if (error) throw error;

                              const processed = Number(data?.processedProducts || 0);
                              totalProcessed += processed;
                              hasMore = Boolean(data?.hasMore);
                              offset = Number(data?.nextOffset ?? offset + processed);

                              toast({
                                title: hasMore ? `Embeddings: lote ${run}` : 'Embeddings completados',
                                description: `${processed} productos en este lote • Acumulado: ${totalProcessed}${hasMore ? ' • Continuando…' : ''}`,
                              });

                              run++;
                              retries = 0;
                              if (hasMore) await sleep(800);
                            } catch (err) {
                              retries++;
                              const wait = 1000 * Math.pow(2, retries - 1);
                              if (retries <= maxRetries) {
                                toast({ title: 'Reintentando…', description: `Intento ${retries}/${maxRetries} en ${wait / 1000}s` });
                                await sleep(wait);
                                continue;
                              }
                              throw err;
                            }
                          }

                          toast({
                            title: "Embeddings generados",
                            description: `${totalProcessed} productos procesados en total`,
                          });
                        } catch (error) {
                          console.error('Error generating embeddings:', error);
                          toast({
                            title: "Error",
                            description: error instanceof Error ? error.message : "Error generando embeddings",
                            variant: "destructive"
                          });
                        } finally {
                          setIsGeneratingProductEmbeddings(false);
                        }
                      }}
                      disabled={isGeneratingProductEmbeddings || !embeddingsTargetUserId}
                      className="w-full flex items-center justify-center gap-2 h-12 text-base font-semibold"
                      size="lg"
                    >
                      {isGeneratingProductEmbeddings ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Generando embeddings...
                        </>
                      ) : (
                        <>
                          <Database className="h-5 w-5" />
                          🚀 Generar Embeddings de Productos
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="shopify">
            <AdminShopifyManager userDetails={userDetails} />
          </TabsContent>

          <TabsContent value="whatsapp">
            <WhatsAppCredentialsManager />
          </TabsContent>

          <TabsContent value="images">
            <AdminBulkImageUploader userDetails={userDetails || []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;