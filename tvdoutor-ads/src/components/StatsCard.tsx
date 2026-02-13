import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
  };
  icon: LucideIcon;
  variant?: "primary" | "secondary" | "accent" | "default";
  className?: string;
}

export const StatsCard = ({
  title,
  value,
  change,
  icon: Icon,
  variant = "default",
  className
}: StatsCardProps) => {
  const isPositiveChange = change && change.value > 0;
  
  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-soft hover:scale-105 cursor-pointer",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
            </p>
            {change && (
              <div className="flex items-center gap-1">
                <span className={cn(
                  "text-xs font-medium",
                  isPositiveChange ? "text-secondary" : "text-destructive"
                )}>
                  {isPositiveChange ? "+" : ""}{change.value}%
                </span>
                {change.label && (
                  <span className="text-xs text-muted-foreground">
                    {change.label}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className={cn(
            "p-3 rounded-lg transition-all duration-300",
            variant === "primary" && "bg-primary-soft text-primary",
            variant === "secondary" && "bg-secondary-soft text-secondary",
            variant === "accent" && "bg-accent-soft text-accent",
            variant === "default" && "bg-muted text-muted-foreground"
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};