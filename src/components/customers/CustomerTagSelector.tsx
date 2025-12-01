import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tag as TagIcon, X } from 'lucide-react';
import { useTags, type Tag, type CustomerTag } from '@/hooks/useTags';

interface CustomerTagSelectorProps {
  customerId: string;
  customerName: string;
  onTagsChange?: () => void;
}

export const CustomerTagSelector = ({ customerId, customerName, onTagsChange }: CustomerTagSelectorProps) => {
  const { tags, assignTagToCustomer, removeTagFromCustomer, getCustomerTags } = useTags();
  const [customerTags, setCustomerTags] = useState<CustomerTag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadCustomerTags = async () => {
    setLoading(true);
    try {
      const data = await getCustomerTags(customerId);
      setCustomerTags(data);
    } catch (error) {
      console.error('Error loading customer tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTag = async (tagId: string) => {
    try {
      await assignTagToCustomer(customerId, tagId);
      await loadCustomerTags();
      onTagsChange?.(); // Notify parent component
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagFromCustomer(customerId, tagId);
      await loadCustomerTags();
      onTagsChange?.(); // Notify parent component
    } catch (error) {
      // Error handled in hook
    }
  };

  const assignedTagIds = customerTags.map(ct => ct.tag_id);
  const availableTags = tags.filter(tag => !assignedTagIds.includes(tag.id));

  useEffect(() => {
    if (isOpen) {
      loadCustomerTags();
    }
  }, [isOpen, customerId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <TagIcon className="h-4 w-4 mr-2" />
          Etiquetas
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Etiquetas de {customerName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Etiquetas Asignadas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">Etiquetas Asignadas</h4>
              <Badge variant="secondary" className="text-xs">
                {customerTags.length} etiqueta{customerTags.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            {loading ? (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground text-sm">Cargando etiquetas...</p>
              </div>
            ) : customerTags.length === 0 ? (
              <div className="p-4 bg-muted/30 rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground text-sm text-center">
                  No hay etiquetas asignadas
                </p>
                <p className="text-muted-foreground text-xs text-center mt-1">
                  Selecciona etiquetas de la sección de abajo
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                {customerTags.map(customerTag => (
                  <Badge
                    key={customerTag.id}
                    variant="outline"
                    style={{ 
                      backgroundColor: customerTag.tag.color, 
                      color: 'white', 
                      borderColor: customerTag.tag.color 
                    }}
                    className="flex items-center gap-1 shadow-sm"
                    title={`Asignada por: ${customerTag.assigned_by_type === 'agent' ? 'Agente IA' : customerTag.assigned_by_type === 'system' ? 'Sistema' : 'Usuario'} el ${new Date(customerTag.assigned_at).toLocaleString()}`}
                  >
                    {customerTag.tag.name}
                    {customerTag.assigned_by_type === 'agent' && (
                      <span className="text-xs opacity-75">🤖</span>
                    )}
                    <button
                      onClick={() => handleRemoveTag(customerTag.tag_id)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      title="Remover etiqueta"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Etiquetas Disponibles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">Etiquetas Disponibles</h4>
              <Badge variant="secondary" className="text-xs">
                {availableTags.length} disponible{availableTags.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            {availableTags.length === 0 ? (
              <div className="p-4 bg-muted/30 rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground text-sm text-center">
                  {tags.length === 0 ? 'No hay etiquetas creadas' : 'Todas las etiquetas están asignadas'}
                </p>
                {tags.length === 0 && (
                  <p className="text-muted-foreground text-xs text-center mt-1">
                    Usa "Gestionar Etiquetas" para crear nuevas etiquetas
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Haz clic en una etiqueta para asignarla al cliente
                </p>
                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                  {availableTags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      style={{ backgroundColor: tag.color, color: 'white', borderColor: tag.color }}
                      className="cursor-pointer hover:opacity-80 hover:scale-105 transition-all shadow-sm"
                      onClick={() => handleAssignTag(tag.id)}
                      title={`Asignar etiqueta "${tag.name}"`}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};