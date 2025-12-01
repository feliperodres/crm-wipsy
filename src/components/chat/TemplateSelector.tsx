import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  components: any;
  waba_id: string;
}

interface TemplateSelectorProps {
  phoneNumberId: string;
  customerPhone: string;
  chatId: string;
  onTemplateSent: () => void;
}

export function TemplateSelector({ phoneNumberId, customerPhone, chatId, onTemplateSent }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-templates-list', {
        body: { phoneNumberId, sync: false }
      });

      if (error) throw error;

      const list = Array.isArray(data) ? data : (data && (data as any).templates);
      const approved = (list || []).filter((t: any) => t.status === 'APPROVED');
      approved.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setTemplates(approved);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTemplate = async (template: Template) => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp-meta-message', {
        body: {
          phoneNumberId: phoneNumberId,
          to: customerPhone,
          type: 'template',
          templateName: template.name,
          templateLanguage: template.language
        }
      });

      if (error) {
        console.error('Error sending template:', error);
        toast({
          title: "Error",
          description: error.message || "No se pudo enviar la plantilla",
          variant: "destructive"
        });
        return;
      }

      // Save message to database with template components for rendering
      const { error: dbError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          content: `[Plantilla enviada: ${template.name}]`,
          sender_type: 'business',
          message_type: 'template',
          metadata: { 
            templateName: template.name, 
            templateLanguage: template.language,
            components: template.components // Include full template structure
          }
        });

      if (dbError) {
        console.error('Database error:', dbError);
        toast({
          title: "Advertencia",
          description: "La plantilla se envió pero no se pudo guardar en el historial",
          variant: "default"
        });
      }

      toast({
        title: "Plantilla enviada",
        description: `La plantilla "${template.name}" se envió correctamente`,
      });
      
      setIsOpen(false);
      onTemplateSent();
    } catch (error) {
      console.error('Error sending template:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la plantilla",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'REJECTED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Plantilla
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar Plantilla de WhatsApp</DialogTitle>
          <DialogDescription>
            Selecciona una plantilla aprobada para este número.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay plantillas aprobadas disponibles
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription>
                          {template.category} • {template.language}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusBadgeVariant(template.status)}>
                        {template.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Template preview */}
                      <div className="bg-muted p-3 rounded-md text-sm">
                        {template.components && Array.isArray(template.components) ? (
                          template.components.map((comp: any, idx: number) => (
                            <div key={idx}>
                              {comp.type === 'BODY' && <p>{comp.text}</p>}
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground">Vista previa no disponible</p>
                        )}
                      </div>
                      
                      <Button 
                        onClick={() => handleSendTemplate(template)}
                        disabled={sending}
                        className="w-full"
                      >
                        {sending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Enviar Plantilla
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
