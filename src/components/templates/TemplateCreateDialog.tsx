import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TemplateCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  credentialId?: string;
}

interface ComponentData {
  type: string;
  format?: string;
  text?: string;
}

export const TemplateCreateDialog = ({ open, onOpenChange, onSuccess, credentialId }: TemplateCreateDialogProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Info
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");

  // Step 2: Components
  const [headerType, setHeaderType] = useState("NONE");
  const [headerText, setHeaderText] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");

  const resetForm = () => {
    setStep(1);
    setName("");
    setCategory("");
    setLanguage("");
    setHeaderType("NONE");
    setHeaderText("");
    setBodyText("");
    setFooterText("");
  };

  const validateStep1 = () => {
    if (!name || !category || !language) {
      toast.error("Completa todos los campos requeridos");
      return false;
    }
    // Validate name format (lowercase, numbers, underscores only)
    if (!/^[a-z0-9_]+$/.test(name)) {
      toast.error("El nombre solo puede contener letras minúsculas, números y guiones bajos");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!bodyText) {
      toast.error("El cuerpo del mensaje es requerido");
      return false;
    }
    if (bodyText.length > 1024) {
      toast.error("El cuerpo no puede exceder 1024 caracteres");
      return false;
    }
    if (headerText && headerText.length > 60) {
      toast.error("El encabezado no puede exceder 60 caracteres");
      return false;
    }
    if (footerText && footerText.length > 60) {
      toast.error("El pie de página no puede exceder 60 caracteres");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreate = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const components: ComponentData[] = [];

      // Add header if provided
      if (headerType === "TEXT" && headerText) {
        components.push({
          type: "HEADER",
          format: "TEXT",
          text: headerText
        });
      }

      // Add body (required)
      components.push({
        type: "BODY",
        text: bodyText
      });

      // Add footer if provided
      if (footerText) {
        components.push({
          type: "FOOTER",
          text: footerText
        });
      }

      const { error } = await supabase.functions.invoke('meta-templates-create', {
        body: {
          name,
          category,
          language,
          components,
          credentialId
        }
      });

      if (error) {
        console.error('Error creating template:', error);
        toast.warning('Sincronizando para verificar estado...');
        // Aún así sincronizar para ver si se creó en Meta
        setTimeout(() => onSuccess(), 1000);
        throw error;
      }

      toast.success("Plantilla enviada a Meta para aprobación");
      resetForm();
      onOpenChange(false);
      
      // Sincronizar después de crear exitosamente
      setTimeout(() => onSuccess(), 500);
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast.error("Revisa la lista - la plantilla puede haberse creado en Meta");
    } finally {
      setLoading(false);
    }
  };

  const countVariables = (text: string) => {
    const matches = text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Crear Nueva Plantilla - Paso {step} de 2
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Plantilla *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="ejemplo_plantilla_2024"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  Solo letras minúsculas, números y guiones bajos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">Utilidad</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="AUTHENTICATION">Autenticación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Idioma *</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="es_MX">Español (México)</SelectItem>
                    <SelectItem value="es_AR">Español (Argentina)</SelectItem>
                    <SelectItem value="en">Inglés</SelectItem>
                    <SelectItem value="en_US">Inglés (US)</SelectItem>
                    <SelectItem value="pt_BR">Portugués (Brasil)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headerType">Encabezado (Opcional)</Label>
                <Select value={headerType} onValueChange={setHeaderType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin encabezado</SelectItem>
                    <SelectItem value="TEXT">Texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {headerType === "TEXT" && (
                <div className="space-y-2">
                  <Label htmlFor="headerText">Texto del Encabezado</Label>
                  <Input
                    id="headerText"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    placeholder="¡Hola {{1}}!"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">
                    {headerText.length}/60 caracteres • Variables: {countVariables(headerText)}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="bodyText">Cuerpo del Mensaje *</Label>
                <Textarea
                  id="bodyText"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Tu pedido {{1}} está en proceso. Usa las variables {{1}}, {{2}}, etc."
                  rows={6}
                  maxLength={1024}
                />
                <p className="text-xs text-muted-foreground">
                  {bodyText.length}/1024 caracteres • Variables: {countVariables(bodyText)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerText">Pie de Página (Opcional)</Label>
                <Input
                  id="footerText"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Equipo de Soporte"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {footerText.length}/60 caracteres
                </p>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-3">Vista Previa</h4>
                <div className="bg-background p-4 rounded border space-y-2">
                  {headerType === "TEXT" && headerText && (
                    <div className="font-bold">{headerText}</div>
                  )}
                  {bodyText && (
                    <div className="whitespace-pre-wrap">{bodyText}</div>
                  )}
                  {footerText && (
                    <div className="text-xs text-muted-foreground mt-2">{footerText}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Atrás
            </Button>

            {step === 1 ? (
              <Button onClick={handleNext}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Creando..." : "Enviar a Meta"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
