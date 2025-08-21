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
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface SidebarProps {
  isCollapsed?: boolean;
  className?: string;
}

const menuItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Inventário",
    icon: Monitor,
    href: "/inventory"
  },
  {
    label: "Propostas",
    icon: FileText,
    href: "/nova-proposta"
  },
  {
    label: "Mapa",
    icon: MapPin,
    href: "/mapa-interativo"
  },
  {
    label: "Campanhas",
    icon: Calendar,
    href: "/campaigns",
    requiredRole: "Manager" as UserRole
  },
  {
    label: "Relatórios",
    icon: BarChart3,
    href: "/reports",
    requiredRole: "Manager" as UserRole
  },
  {
    label: "Pontos de Venda",
    icon: Package,
    href: "/venues",
    requiredRole: "Manager" as UserRole
  },
  {
    label: "Usuários",
    icon: Users,
    href: "/users",
    requiredRole: "Admin" as UserRole
  },
  {
    label: "Configurações",
    icon: Settings,
    href: "/settings"
  }
];

export const Sidebar = ({ isCollapsed = false, className }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole } = useAuth();

  return (
    <aside className={cn(
      "bg-card border-r border-border flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems
          .filter((item) => !item.requiredRole || hasRole(item.requiredRole))
          .map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 transition-all duration-200",
                  isCollapsed && "px-2"
                )}
                onClick={() => navigate(item.href)}
              >
                <item.icon className={cn(
                  "h-5 w-5 shrink-0",
                  isActive && "text-primary"
                )} />
                {!isCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Button>
            );
          })}
      </nav>


    </aside>
  );
};