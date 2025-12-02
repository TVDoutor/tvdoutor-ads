import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatCard {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string;
  subtitle?: string;
  badge?: {
    label: string;
    icon?: LucideIcon;
  };
  onClick?: () => void;
}

interface StatsGridProps {
  stats: StatCard[];
  columns?: 2 | 3 | 4 | 6;
}

export const StatsGrid = ({ stats, columns = 4 }: StatsGridProps) => {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 md:gap-6`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const BadgeIcon = stat.badge?.icon;

        return (
          <Card
            key={index}
            className={`group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ${stat.gradient} ${stat.onClick ? 'cursor-pointer' : ''}`}
            onClick={stat.onClick}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />

            <CardContent className="p-4 md:p-6 relative z-10">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 bg-white/20 backdrop-blur-sm rounded-xl md:rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Icon className="h-4 w-4 md:h-6 md:w-6 text-white" />
                </div>
                {stat.badge && (
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">
                    {BadgeIcon && <BadgeIcon className="h-3 w-3 mr-1" />}
                    {stat.badge.label}
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-white/80 text-xs md:text-sm font-medium">{stat.title}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl md:text-4xl font-black text-white">
                    {stat.value}
                  </h3>
                  {stat.subtitle && (
                    <span className="text-white/60 text-xs md:text-sm">{stat.subtitle}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

