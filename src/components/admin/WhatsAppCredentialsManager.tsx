import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit, Plus, Check, X, Copy } from "lucide-react";

interface UserWithCredentials {
  user_id: string;
  email: string;
  business_name: string;
  has_credentials: boolean;
  api_url?: string;
  instance_name?: string;
  status?: string;
}

export const WhatsAppCredentialsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserWithCredentials | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    apiUrl: "",
    apiKey: "",
    instanceName: ""
  });

  // Query para obtener usuarios con sus credenciales
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-whatsapp-users'],
    queryFn: async () => {
      // Obtener todos los usuarios del admin RPC
      const { data: adminUsers, error: adminError } = await supabase.rpc('get_admin_user_details');
      
      if (adminError) throw adminError;

      // Obtener credenciales existentes
      const { data: credentials, error: credError } = await supabase
        .from('whatsapp_evolution_credentials')
        .select('user_id, api_url, instance_name, status');
      
      if (credError) throw credError;

      // Combinar datos
      return adminUsers?.map((user: any) => {
        const userCreds = credentials?.find(c => c.user_id === user.user_id);
        
        return {
          user_id: user.user_id,
          email: user.email || 'N/A',
          business_name: user.business_name || 'Sin nombre',
          has_credentials: !!userCreds,
          api_url: userCreds?.api_url,
          instance_name: userCreds?.instance_name,
          status: userCreds?.status
        };
      }) || [];
    }
  });

  // Mutation para guardar credenciales
  const saveMutation = useMutation({
    mutationFn: async ({ userId, apiUrl, apiKey, instanceName }: {
      userId: string;
      apiUrl: string;
      apiKey: string;
      instanceName: string;
    }) => {
      // Primero validar las credenciales
      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        'validate-evolution-credentials',
        { body: { apiUrl, apiKey, instanceName } }
      );

      // Manejar errores de validación
      if (validationError) {
        console.error('Validation error:', validationError);
        throw new Error(`Error de validación: ${validationError.message}`);
      }

      // Verificar si la respuesta de validación fue exitosa
      if (!validationData || !validationData.success) {
        const errorMsg = validationData?.error || 'Credenciales inválidas';
        console.error('Validation failed:', errorMsg);
        throw new Error(errorMsg);
      }

      // Si son válidas, guardarlas
      const { error: upsertError } = await supabase
        .from('whatsapp_evolution_credentials')
        .upsert({
          user_id: userId,
          api_url: apiUrl.trim(),
          api_key: apiKey.trim(),
          instance_name: instanceName.trim(),
          status: 'active'
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) throw upsertError;
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Credenciales guardadas correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-users'] });
      setIsDialogOpen(false);
      setFormData({ apiUrl: "", apiKey: "", instanceName: "" });
      setSelectedUser(null);
    },
    onError: (error: any) => {
      console.error('Save mutation error:', error);
      let errorMessage = "Error al guardar credenciales";
      
      if (error.message) {
        // Mensajes de error más amigables
        if (error.message.includes('not found')) {
          errorMessage = `La instancia "${formData.instanceName}" no existe en tu Evolution API. Por favor verifica el nombre de la instancia.`;
        } else if (error.message.includes('Invalid credentials')) {
          errorMessage = "Las credenciales son inválidas. Verifica la URL y API Key.";
        } else if (error.message.includes('API error')) {
          errorMessage = "No se pudo conectar con la Evolution API. Verifica la URL.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const getWebhookUrl = (userEmail: string) => {
    const baseUrl = 'https://fczgowziugcvrpgfelks.supabase.co/functions/v1';
    const userHash = btoa(userEmail).replace(/[+/=]/g, '').substring(0, 16);
    return `${baseUrl}/whatsapp-webhook?user=${userHash}`;
  };

  const copyWebhookUrl = (userEmail: string) => {
    const webhookUrl = getWebhookUrl(userEmail);
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Copiado",
      description: "URL del webhook copiada al portapapeles",
    });
  };

  const handleOpenDialog = (user: UserWithCredentials) => {
    setSelectedUser(user);
    setFormData({
      apiUrl: user.api_url || "",
      apiKey: "",
      instanceName: user.instance_name || ""
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser || !formData.apiUrl || !formData.apiKey || !formData.instanceName) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      userId: selectedUser.user_id,
      apiUrl: formData.apiUrl,
      apiKey: formData.apiKey,
      instanceName: formData.instanceName
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Credenciales WhatsApp</CardTitle>
        <CardDescription>
          Configura las credenciales de conexión externa para cada usuario
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Instancia</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.business_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.has_credentials ? (
                      <Badge variant="default">
                        <Check className="h-3 w-3 mr-1" />
                        Configurado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <X className="h-3 w-3 mr-1" />
                        Sin configurar
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.instance_name || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(user)}
                      >
                        {user.has_credentials ? (
                          <>
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyWebhookUrl(user.email)}
                        title="Copiar URL del webhook"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <Dialog open={isDialogOpen && selectedUser?.user_id === user.user_id} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <div className="hidden" />
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>
                            {selectedUser?.has_credentials ? 'Editar' : 'Agregar'} Credenciales
                          </DialogTitle>
                          <DialogDescription>
                            Configura las credenciales de WhatsApp para {selectedUser?.business_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          {selectedUser && (
                            <div className="space-y-2">
                              <Label>URL del Webhook</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={getWebhookUrl(selectedUser.email)}
                                  readOnly
                                  className="font-mono text-xs"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyWebhookUrl(selectedUser.email)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Copia esta URL y configúrala en tu instancia de Evolution API
                              </p>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor="apiUrl">URL de API *</Label>
                            <Input
                              id="apiUrl"
                              type="url"
                              placeholder="https://tu-api.com"
                              value={formData.apiUrl}
                              onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="apiKey">API Key *</Label>
                            <Input
                              id="apiKey"
                              type="password"
                              placeholder="Tu API Key"
                              value={formData.apiKey}
                              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="instanceName">Nombre de Instancia *</Label>
                            <Input
                              id="instanceName"
                              placeholder="Nombre de instancia"
                              value={formData.instanceName}
                              onChange={(e) => setFormData({ ...formData, instanceName: e.target.value })}
                            />
                          </div>

                          <Button
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="w-full"
                          >
                            {saveMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Guardando...
                              </>
                            ) : (
                              'Guardar Credenciales'
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};