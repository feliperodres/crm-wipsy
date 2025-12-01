import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  components: any[];
  rejection_reason?: string;
  created_at: string;
}

interface TemplateDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template;
  onDelete: () => void;
}

export const TemplateDetailsDialog = ({ open, onOpenChange, template, onDelete }: TemplateDetailsDialogProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('meta-templates-delete', {
        body: {
          templateId: template.id,
          name: template.name
        }
      });

      if (error) throw error;

      toast.success("Plantilla eliminada correctamente");
      setDeleteDialogOpen(false);
      onOpenChange(false);
      onDelete();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.message || "Error al eliminar la plantilla");
    } finally {
      setDeleting(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      MARKETING: "Marketing",
      UTILITY: "Utilidad",
      AUTHENTICATION: "Autenticación"
    };
    return labels[category] || category;
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

  const renderComponent = (component: any, index: number) => {
    return (
      <div key={index} className="p-3 bg-muted rounded-lg">
        <div className="font-semibold text-sm mb-2">
          {component.type === "HEADER" && "Encabezado"}
          {component.type === "BODY" && "Cuerpo"}
          {component.type === "FOOTER" && "Pie de página"}
        </div>
        {component.text && (
          <div className="whitespace-pre-wrap text-sm">{component.text}</div>
        )}
        {component.format && (
          <div className="text-xs text-muted-foreground mt-1">
            Formato: {component.format}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {template.name}
              {getStatusBadge(template.status)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Categoría</div>
                <div className="font-medium">{getCategoryLabel(template.category)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Idioma</div>
                <div className="font-medium">{template.language}</div>
              </div>
            </div>

            {template.rejection_reason && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <div className="text-sm font-semibold text-destructive mb-1">
                  Razón del Rechazo
                </div>
                <div className="text-sm text-destructive">
                  {template.rejection_reason}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-semibold">Componentes</h4>
              {template.components?.map((component, index) => renderComponent(component, index))}
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-3">Vista Previa</h4>
              <div className="bg-background p-4 rounded border space-y-2">
                {template.components?.map((component, index) => {
                  if (component.type === "HEADER" && component.text) {
                    return <div key={index} className="font-bold">{component.text}</div>;
                  }
                  if (component.type === "BODY" && component.text) {
                    return <div key={index} className="whitespace-pre-wrap">{component.text}</div>;
                  }
                  if (component.type === "FOOTER" && component.text) {
                    return <div key={index} className="text-xs text-muted-foreground mt-2">{component.text}</div>;
                  }
                  return null;
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la plantilla "{template.name}" de Meta y de tu cuenta.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
