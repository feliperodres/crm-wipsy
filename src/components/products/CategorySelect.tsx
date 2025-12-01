import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CategorySelect({ value, onChange, placeholder = "Selecciona o crea una categoría" }: CategorySelectProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('user_id', user.id)
        .not('category', 'is', null);

      if (error) throw error;

      const uniqueCategories = [...new Set(data.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddNewCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const trimmedCategory = newCategory.trim();
      setCategories(prev => [...prev, trimmedCategory]);
      onChange(trimmedCategory);
      setNewCategory('');
      setShowNewCategory(false);
    }
  };

  const handleSelectValue = (selectedValue: string) => {
    if (selectedValue === 'new-category') {
      setShowNewCategory(true);
    } else {
      onChange(selectedValue);
    }
  };

  if (showNewCategory) {
    return (
      <div className="flex gap-2">
        <Input
          placeholder="Nueva categoría"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddNewCategory()}
          autoFocus
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAddNewCategory}
          disabled={!newCategory.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setShowNewCategory(false);
            setNewCategory('');
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={handleSelectValue}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.length > 0 && (
          <>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
            <div className="border-t my-1" />
          </>
        )}
        <SelectItem value="new-category" className="text-primary">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Crear nueva categoría
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}