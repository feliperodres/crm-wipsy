import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, X } from 'lucide-react';

interface VariantOption {
  name: string;
  values: string[];
}

interface OptionsManagerProps {
  options: VariantOption[];
  onOptionsChange: (options: VariantOption[]) => void;
  onGenerateVariants: () => void;
  onValueAdded?: () => void; // Nuevo callback para cuando se añade un valor
}

export function OptionsManager({ options, onOptionsChange, onGenerateVariants, onValueAdded }: OptionsManagerProps) {
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  const addOption = () => {
    if (!newOptionName.trim()) return;
    
    const newOption: VariantOption = {
      name: newOptionName.trim(),
      values: []
    };
    
    onOptionsChange([...options, newOption]);
    setNewOptionName('');
  };

  const removeOption = (index: number) => {
    const updatedOptions = options.filter((_, i) => i !== index);
    onOptionsChange(updatedOptions);
  };

  const addOptionValue = (optionIndex: number) => {
    if (!newOptionValue.trim()) return;
    
    const updatedOptions = [...options];
    if (!updatedOptions[optionIndex].values.includes(newOptionValue.trim())) {
      updatedOptions[optionIndex].values.push(newOptionValue.trim());
      onOptionsChange(updatedOptions);
      
      // Notificar que se añadió un valor para generar variantes automáticamente
      if (onValueAdded) {
        setTimeout(() => {
          onValueAdded();
        }, 100); // Pequeño delay para que se actualice el estado primero
      }
    }
    setNewOptionValue('');
  };

  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    const updatedOptions = [...options];
    updatedOptions[optionIndex].values.splice(valueIndex, 1);
    onOptionsChange(updatedOptions);
    
    // Notificar que se eliminó un valor para actualizar variantes automáticamente
    if (onValueAdded) {
      setTimeout(() => {
        onValueAdded();
      }, 100);
    }
  };

  const getTotalCombinations = () => {
    if (options.length === 0) return 0;
    return options.reduce((total, option) => total * (option.values.length || 1), 1);
  };

  return (
    <div className="space-y-4">
      {/* Add New Option */}
      <div className="flex gap-2">
        <Input
          placeholder="Nombre de la opción (ej: Color, Talla)"
          value={newOptionName}
          onChange={(e) => setNewOptionName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addOption()}
        />
        <Button type="button" onClick={addOption} disabled={!newOptionName.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Existing Options */}
      {options.map((option, optionIndex) => (
        <Card key={optionIndex} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{option.name}</CardTitle>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeOption(optionIndex)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Option Values */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {option.values.map((value, valueIndex) => (
                  <Badge key={valueIndex} variant="secondary" className="flex items-center gap-1">
                    {value}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeOptionValue(optionIndex, valueIndex)}
                    />
                  </Badge>
                ))}
              </div>
              
              {/* Add Value */}
              <div className="flex gap-2">
                <Input
                  placeholder={`Agregar ${option.name.toLowerCase()} (ej: Rojo, Azul)`}
                  value={newOptionValue}
                  onChange={(e) => setNewOptionValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addOptionValue(optionIndex)}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => addOptionValue(optionIndex)}
                  disabled={!newOptionValue.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Auto-generation info */}
      {options.length > 0 && options.some(opt => opt.values.length > 0) && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="text-sm font-medium text-green-900">
                ✨ Se generan automáticamente {getTotalCombinations()} variantes
              </p>
              <p className="text-xs text-green-700 mt-1">
                Las variantes se crean automáticamente al añadir o quitar valores. Los precios y stock se conservan.
                {getTotalCombinations() > 20 && " ⚠️ Esto creará muchas variantes."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {options.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            💡 <strong>Consejo:</strong> Agrega opciones como "Color", "Talla", "Material" para generar variantes automáticamente.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Por ejemplo: Color → Rojo, Azul, Verde | Talla → S, M, L, XL
          </p>
        </div>
      )}
    </div>
  );
}
