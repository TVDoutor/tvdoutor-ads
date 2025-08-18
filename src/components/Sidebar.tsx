import { 
  LayoutDashboard, 
  Monitor, 
  FileText, 
  MapPin, 
  BarChart3, 
  Settings, 
  Users,
  Calendar,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isCollapsed?: boolean;
  className?: string;
}

const menuItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    active: true
  },
  {
    label: "Inventário",
    icon: Monitor,
    href: "/inventory"
  },
  {
    label: "Propostas",
    icon: FileText,
    href: "/proposals"
  },
  {
    label: "Mapa",
    icon: MapPin,
    href: "/map"
  },
  {
    label: "Campanhas",
    icon: Calendar,
    href: "/campaigns"
  },
  {
    label: "Relatórios",
    icon: BarChart3,
    href: "/reports"
  },
  {
    label: "Pontos de Venda",
    icon: Package,
    href: "/venues"
  },
  {
    label: "Usuários",
    icon: Users,
    href: "/users",
    adminOnly: true
  },
  {
    label: "Configurações",
    icon: Settings,
    href: "/settings"
  }
];

export const Sidebar = ({ isCollapsed = false, className }: SidebarProps) => {
  return (
    <aside className={cn(
      "bg-card border-r border-border flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.href}
            variant={item.active ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 transition-all duration-200",
              isCollapsed && "px-2"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 shrink-0",
              item.active && "text-primary"
            )} />
            {!isCollapsed && (
              <span className="truncate">{item.label}</span>
            )}
          </Button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className={cn(
          "bg-primary-soft rounded-lg p-3 transition-all duration-200",
          isCollapsed && "p-2"
        )}>
          {!isCollapsed ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary">
                Upgrade para Pro
              </p>
              <p className="text-xs text-muted-foreground">
                Desbloqueie recursos avançados
              </p>
              <Button size="sm" className="w-full">
                Upgrade
              </Button>
            </div>
          ) : (
            <Button size="icon" variant="ghost" className="w-full h-8">
              <Package className="h-4 w-4 text-primary" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};