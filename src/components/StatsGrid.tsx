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

  // Extrai a cor do gradiente (ex: "from-[#f48220]" -> "orange")
  const getIconColorClasses = (gradient: string) => {
    if (gradient.includes('#f48220') || gradient.includes('orange')) return { bg: 'bg-orange-50', text: 'text-[#f48220]' };
    if (gradient.includes('slate') || gradient.includes('gray')) return { bg: 'bg-gray-50', text: 'text-gray-600' };
    if (gradient.includes('blue')) return { bg: 'bg-blue-50', text: 'text-blue-600' };
    if (gradient.includes('green')) return { bg: 'bg-green-50', text: 'text-green-600' };
    if (gradient.includes('purple')) return { bg: 'bg-purple-50', text: 'text-purple-600' };
    if (gradient.includes('red')) return { bg: 'bg-red-50', text: 'text-red-600' };
    if (gradient.includes('yellow')) return { bg: 'bg-yellow-50', text: 'text-yellow-600' };
    return { bg: 'bg-gray-50', text: 'text-gray-600' }; // fallback
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 md:gap-6`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const BadgeIcon = stat.badge?.icon;
        const colors = getIconColorClasses(stat.gradient);

        return (
          <Card
            key={index}
            className={`bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl ${stat.onClick ? 'cursor-pointer' : ''}`}
            onClick={stat.onClick}
          >
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className={`p-2 md:p-3 ${colors.bg} rounded-xl`}>
                  <Icon className={`h-5 w-5 md:h-6 md:w-6 ${colors.text}`} />
                </div>
                {stat.badge && (
                  <Badge variant="outline" className={`${colors.text} border-${colors.text.replace('text-', '')}-200 ${colors.bg} text-xs`}>
                    {BadgeIcon && <BadgeIcon className="h-3 w-3 mr-1" />}
                    {stat.badge.label}
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-gray-600 text-xs md:text-sm font-medium">{stat.title}</h3>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  {stat.subtitle && (
                    <span className="text-gray-500 text-xs">{stat.subtitle}</span>
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

