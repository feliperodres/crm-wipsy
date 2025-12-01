import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import { TemplateCreateDialog } from "@/components/templates/TemplateCreateDialog";
import { TemplateDetailsDialog } from "@/components/templates/TemplateDetailsDialog";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  components: any[];
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

const Templates = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [hasMetaCreds, setHasMetaCreds] = useState<boolean | null>(null);
  const [credentials, setCredentials] = useState<Array<{id:string; phone_number:string; business_name:string; waba_id:string; is_default?: boolean}>>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const init = async () => {
      try {
        const { data, error } = await supabase
          .from('whatsapp_meta_credentials')
          .select('id, phone_number, business_name, waba_id, is_default')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setCredentials(data || []);
        setHasMetaCreds((data?.length || 0) > 0);
        // Preselect default or first
        const def = data?.find(d => d.is_default) || data?.[0] || null;
        setSelectedCredentialId(def?.id || null);
      } catch (e) {
        console.error('Error loading Meta credentials:', e);
        setHasMetaCreds(false);
      }
    };
    init();
  }, [user, navigate]);

  // Fetch templates when selectedCredentialId changes
  useEffect(() => {
    if (selectedCredentialId) {
      fetchTemplates(false);
    } else {
      setTemplates([]);
      setLoading(false);
    }
  }, [selectedCredentialId]);

  const fetchTemplates = async (sync = false) => {
    try {
      if (sync) setSyncing(true);
      else setLoading(true);

      if (!selectedCredentialId) {
        setTemplates([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke('meta-templates-list', {
        body: { sync, credentialId: selectedCredentialId }
      });

      if (error) {
        console.error('Error fetching templates:', error);
        toast.error('Error al cargar plantillas');
        return;
      }

      setTemplates(data.templates || []);
      
      if (sync) {
        toast.success(`${data.templates?.length || 0} plantillas sincronizadas`);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Error al cargar plantillas');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleSync = () => {
    fetchTemplates(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      APPROVED: { variant: "default", label: "Aprobada" },
      PENDING: { variant: "secondary", label: "Pendiente" },
      REJECTED: { variant: "destructive", label: "Rechazada" },
      DISABLED: { variant: "outline", label: "Deshabilitada" }
    };

    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const labels: Record<string, string> = {
      MARKETING: "Marketing",
      UTILITY: "Utilidad",
      AUTHENTICATION: "Autenticación"
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plantillas de WhatsApp</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus plantillas de mensajes aprobadas por Meta
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {hasMetaCreds && (
            <Select value={selectedCredentialId ?? undefined} onValueChange={setSelectedCredentialId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Selecciona número" />
              </SelectTrigger>
              <SelectContent>
                {credentials.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.business_name} · {c.phone_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing || !selectedCredentialId}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} disabled={!selectedCredentialId}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
        </div>
      </div>
      {hasMetaCreds === false && (
        <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Conecta WhatsApp Oficial para usar plantillas</h3>
              <p className="text-sm text-muted-foreground">Debes conectar tu cuenta de WhatsApp Business (Meta) para crear y sincronizar plantillas.</p>
            </div>
            <Button onClick={() => navigate('/whatsapp')}>Conectar ahora</Button>
          </div>
        </Card>
      )}

      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay plantillas</h3>
          <p className="text-muted-foreground mb-4">
            Crea tu primera plantilla para empezar a enviar mensajes pre-aprobados
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Primera Plantilla
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedTemplate(template);
                setDetailsDialogOpen(true);
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getCategoryBadge(template.category)}
                  </p>
                </div>
                {getStatusBadge(template.status)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Idioma:</span>
                  <span className="font-medium">{template.language}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Componentes:</span>
                  <span className="font-medium">{template.components?.length || 0}</span>
                </div>
              </div>

              {template.rejection_reason && (
                <div className="mt-3 p-2 bg-destructive/10 rounded text-xs text-destructive">
                  {template.rejection_reason}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <TemplateCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        credentialId={selectedCredentialId || undefined}
        onSuccess={() => fetchTemplates()}
      />

      {selectedTemplate && (
        <TemplateDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          template={selectedTemplate}
          onDelete={() => fetchTemplates()}
        />
      )}
      </div>
    </DashboardLayout>
  );
};

export default Templates;
