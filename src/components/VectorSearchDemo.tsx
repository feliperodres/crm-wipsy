import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { searchProductsVector, VectorSearchResult } from '@/utils/vectorSearch';
import { Loader2, Search } from 'lucide-react';

const VectorSearchDemo = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);

  const handleSearch = async () => {
    if (!user || !searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const result = await searchProductsVector(searchQuery, user.id, {
        limit: 10,
        threshold: 0.6 // Umbral más bajo para más resultados
      });

      if (result.success && result.results) {
        setSearchResults(result.results);
        toast({
          title: "✅ Búsqueda completada",
          description: `Se encontraron ${result.results.length} productos`,
        });
      } else {
        setSearchResults([]);
        toast({
          title: "❌ Sin resultados",
          description: result.error || "No se encontraron productos similares",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in vector search:', error);
      toast({
        title: "❌ Error inesperado",
        description: "Error en la búsqueda vectorial",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(price);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Debes estar autenticado para usar la búsqueda vectorial.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Búsqueda Vectorial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda Semántica
          </CardTitle>
          <CardDescription>
            Busca productos usando lenguaje natural. Ej: "relojes deportivos", "zapatos cómodos"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar productos por descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="flex items-center gap-2"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Resultados de búsqueda:</h4>
              {searchResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium">{result.product_name}</h5>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.product_description}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline">
                          {result.category}
                        </Badge>
                        <span className="text-sm font-medium">
                          {formatPrice(result.price)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Stock: {result.stock}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Badge variant="secondary">
                        {Math.round(result.similarity * 100)}% match
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VectorSearchDemo;