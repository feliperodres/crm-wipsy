import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tag } from '@/hooks/useTags';

interface ChatFiltersProps {
  tags: Tag[];
  selectedTags: string[];
  onTagToggle: (tagId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
}

export function ChatFilters({
  tags,
  selectedTags,
  onTagToggle,
  searchQuery,
  onSearchChange,
  onClearFilters
}: ChatFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const hasActiveFilters = selectedTags.length > 0 || searchQuery.length > 0;

  return (
    <div className="flex flex-col gap-3 p-4 border-b">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar chats..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedTags.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="p-2">
              <div className="font-medium text-sm mb-2">Filtrar por etiquetas</div>
              {tags.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hay etiquetas disponibles</div>
              ) : (
                <div className="space-y-1">
                  {tags.map((tag) => (
                    <DropdownMenuItem
                      key={tag.id}
                      onClick={() => onTagToggle(tag.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </div>
                      {selectedTags.includes(tag.id) && (
                        <Badge variant="secondary" className="h-4 text-xs">
                          ✓
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              
              {hasActiveFilters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      onClearFilters();
                      setIsFilterOpen(false);
                    }}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpiar filtros
                  </DropdownMenuItem>
                </>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          {selectedTags.map((tagId) => {
            const tag = tags.find(t => t.id === tagId);
            if (!tag) return null;
            
            return (
              <Badge
                key={tagId}
                variant="secondary"
                className="gap-1 cursor-pointer"
                onClick={() => onTagToggle(tagId)}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => onSearchChange('')}>
              Búsqueda: "{searchQuery}"
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}