import { useState } from "react";
import { 
  LayoutDashboard, 
  Monitor, 
  FileText, 
  MapPin, 
  BarChart3, 
  Settings, 
  Users,
  Calendar,
  Package,
  Building2,
  FolderOpen,
  ChevronDown,
  ChevronRight
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
    href: "/propostas",
    subItems: [
      { label: "Todas as Propostas", href: "/propostas" },
      { label: "Nova Proposta", href: "/nova-proposta" }
    ]
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
    label: "Agências",
    icon: Building2,
    href: "/agencias",
    requiredRole: "Manager" as UserRole,
    subItems: [
      { label: "Gerenciar Agências", href: "/agencias" },
      { label: "Projetos", href: "/agencias/projetos" }
    ]
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
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

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
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenus.includes(item.label);
            const isSubItemActive = hasSubItems && item.subItems.some(subItem => location.pathname === subItem.href);
            
            const toggleExpanded = () => {
              if (hasSubItems && !isCollapsed) {
                setExpandedMenus(prev => 
                  prev.includes(item.label) 
                    ? prev.filter(label => label !== item.label)
                    : [...prev, item.label]
                );
              } else {
                navigate(item.href);
              }
            };

            return (
              <div key={item.href}>
                <Button
                  variant={(isActive || isSubItemActive) ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 transition-all duration-200",
                    isCollapsed && "px-2"
                  )}
                  onClick={toggleExpanded}
                >
                  <item.icon className={cn(
                    "h-5 w-5 shrink-0",
                    (isActive || isSubItemActive) && "text-primary"
                  )} />
                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {hasSubItems && (
                        <div className="ml-auto">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </Button>
                
                {/* Submenu */}
                {hasSubItems && isExpanded && !isCollapsed && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.subItems.map((subItem) => {
                      const isSubActive = location.pathname === subItem.href;
                      return (
                        <Button
                          key={subItem.href}
                          variant={isSubActive ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start gap-2 text-sm"
                          onClick={() => navigate(subItem.href)}
                        >
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                          <span className="truncate">{subItem.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </nav>


    </aside>
  );
};