import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Eye, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  stock: number;
}

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onView?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export const ProductCard = ({ product, onEdit, onView, onDelete }: ProductCardProps) => {
  return (
    <Card className="group bg-card border border-border/50 shadow-sm rounded-2xl overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-300">
      <div className="flex flex-col h-full">
        <div className="relative h-48 overflow-hidden bg-muted/50">
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='14' fill='%23475569' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
            }}
          />
          <div className="absolute top-3 right-3">
            <Badge 
              variant={product.stock > 0 ? "default" : "destructive"} 
              className={cn(
                "backdrop-blur-md shadow-sm",
                product.stock > 0 ? "bg-green-500/90 hover:bg-green-500 text-white" : ""
              )}
            >
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </Badge>
          </div>
        </div>
        
        <CardContent className="flex-1 p-5 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-lg text-foreground line-clamp-1">{product.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{product.category}</p>
            </div>
            <span className="text-lg font-bold text-primary">${product.price}</span>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {product.description}
          </p>
          
          <div className="flex gap-2 pt-4 border-t border-border/50">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 hover:bg-primary/10 hover:text-primary"
              onClick={() => onView?.(product)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="hover:bg-primary/10 hover:text-primary"
              onClick={() => onEdit?.(product)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete?.(product)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};
