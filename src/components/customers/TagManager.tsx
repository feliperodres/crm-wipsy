import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Tag as TagIcon } from 'lucide-react';
import { useTags, type Tag } from '@/hooks/useTags';

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

interface TagManagerProps {
  onTagSelect?: (tag: Tag) => void;
}

export const TagManager = ({ onTagSelect }: TagManagerProps) => {
  const { tags, createTag, updateTag, deleteTag, loading } = useTags();
  const [isOpen, setIsOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({ name: '', color: PRESET_COLORS[0] });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTag) {
        await updateTag(editingTag.id, formData.name, formData.color);
      } else {
        await createTag(formData.name, formData.color);
      }
      
      setFormData({ name: '', color: PRESET_COLORS[0] });
      setEditingTag(null);
      setIsOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta etiqueta?')) {
      await deleteTag(id);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', color: PRESET_COLORS[0] });
    setEditingTag(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <TagIcon className="h-4 w-4 mr-2" />
          Gestionar Etiquetas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestionar Etiquetas</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre de la etiqueta"
                  required
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2 mt-1">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-foreground' : 'border-border'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {editingTag ? 'Actualizar' : 'Crear'} Etiqueta
            </Button>
          </form>

          <div>
            <h3 className="text-sm font-medium mb-3">Etiquetas Existentes</h3>
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : tags.length === 0 ? (
              <p className="text-muted-foreground">No hay etiquetas creadas</p>
            ) : (
              <div className="space-y-2">
                {tags.map(tag => (
                  <div key={tag.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        style={{ backgroundColor: tag.color, color: 'white', borderColor: tag.color }}
                        className="cursor-pointer"
                        onClick={() => onTagSelect?.(tag)}
                      >
                        {tag.name}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(tag)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tag.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};