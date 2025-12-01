import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export const StatsCard = ({ title, value, description, icon: Icon, trend, className }: StatsCardProps) => {
  return (
    <Card className={cn(
      "relative overflow-hidden border-0 bg-card shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group",
      className
    )}>
      {/* Gradient Glow Background */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
      
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-secondary text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
          </div>
          
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend.isPositive 
                ? "bg-green-500/10 text-green-500" 
                : "bg-red-500/10 text-red-500"
            )}>
              {trend.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend.value}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Decorative bottom gradient line mimicking chart */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </CardContent>
    </Card>
  );
};
