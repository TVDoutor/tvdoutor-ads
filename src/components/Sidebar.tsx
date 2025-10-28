// @ts-nocheck
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
  UserCheck,
  Shield,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  User,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface SidebarProps {
  isCollapsed?: boolean;
  className?: string;
  onToggle?: () => void;
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
    href: "/propostas"
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
    requiredRole: "manager" as UserRole
  },
  {
    label: "Relatórios",
    icon: BarChart3,
    href: "/reports",
    requiredRole: "manager" as UserRole
  },
  {
    label: "Pontos de Venda",
    icon: Package,
    href: "/venues",
    requiredRole: "manager" as UserRole
  },
  {
    label: "Projetos",
    icon: Building2,
    href: "/gerenciamento-projetos",
    requiredRole: "manager" as UserRole
  },
  {
    label: "Usuários",
    icon: Users,
    href: "/users",
    requiredRole: "admin" as UserRole
  },
  {
    label: "Monitor de Usuários",
    icon: Shield,
    href: "/user-management",
    requiredRole: "super_admin" as UserRole
  },
  // NOTA: "Pessoas do Projeto" agora está integrado em /gerenciamento-projetos
  // Mantendo a rota /pessoas-projeto ativa para acesso direto, mas removida do menu
  // {
  //   label: "Pessoas do Projeto",
  //   icon: UserCheck,
  //   href: "/pessoas-projeto",
  //   requiredRole: "admin" as UserRole
  // },
  {
    label: "Configurações",
    icon: Settings,
    href: "/settings"
  }
];

export const Sidebar = ({ isCollapsed = false, className, onToggle }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole, profile, signOut } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // Debug: Log do perfil e roles
  console.log('Sidebar Debug:', {
    profile: profile ? {
      id: profile.id,
      email: profile.email,
      role: profile.role
    } : null,
    hasRoleManager: hasRole('manager'),
    hasRoleAdmin: hasRole('admin'),
    hasRoleSuperAdmin: hasRole('super_admin')
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleChangeProfilePhoto = () => {
    // Implementar mudança de foto de perfil
    console.log('Change profile photo');
  };

  return (
    <TooltipProvider>
      <aside className={cn(
        "bg-slate-900 flex flex-col transition-all duration-300 h-screen",
        isCollapsed ? "w-16" : "w-64",
        className
      )}>
        {/* Header - Logo e Toggle */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TV</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">TV Doutor ADS</h2>
                  <p className="text-xs text-slate-400">Digital Out-of-Home Platform</p>
                </div>
              </div>
            )}
            {onToggle && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-slate-800 text-slate-400 hover:text-white"
                onClick={onToggle}
              >
                <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {(() => {
            const filteredItems = menuItems.filter((item) => !item.requiredRole || hasRole(item.requiredRole));
            console.log('Menu Items Filtered:', {
              totalItems: menuItems.length,
              filteredItems: filteredItems.length,
              items: filteredItems.map(item => ({
                label: item.label,
                requiredRole: item.requiredRole,
                hasAccess: !item.requiredRole || hasRole(item.requiredRole)
              }))
            });
            return filteredItems;
          })()
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

              const button = (
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 transition-all duration-200 text-slate-300 hover:text-white hover:bg-slate-800",
                    isCollapsed && "px-2 justify-center",
                    (isActive || isSubItemActive) && "bg-slate-800 text-white"
                  )}
                  onClick={toggleExpanded}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
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
              );

              return (
                <div key={item.href}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {button}
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" className="bg-slate-800 text-white border-slate-700 shadow-lg">
                        <p className="font-medium">{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    button
                  )}
                  
                  {/* Submenu */}
                  {hasSubItems && isExpanded && !isCollapsed && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isSubActive = location.pathname === subItem.href;
                        return (
                          <Button
                            key={subItem.href}
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "w-full justify-start gap-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800",
                              isSubActive && "bg-slate-800 text-white"
                            )}
                            onClick={() => navigate(subItem.href)}
                          >
                            <div className="w-2 h-2 rounded-full bg-slate-500" />
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

        {/* User Info - Canto inferior esquerdo com Dropdown */}
        <div className="p-4 border-t border-slate-700">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 text-slate-300 hover:text-white hover:bg-slate-800 p-2 h-auto",
                  isCollapsed && "px-2 justify-center"
                )}
              >
                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
                  {profile?.avatar ? (
                    <img 
                      src={profile.avatar} 
                      alt={profile.name} 
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-slate-300" />
                  )}
                </div>
                {!isCollapsed && profile && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-white truncate">{profile.name}</p>
                    <p className="text-xs text-slate-400 truncate">{profile.email}</p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-64 bg-white border border-gray-200 shadow-lg"
              side={isCollapsed ? "right" : "top"}
            >
              {/* Header do Dropdown */}
              <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-md">
                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                    {profile?.avatar ? (
                      <img 
                        src={profile.avatar} 
                        alt={profile.name} 
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <p className="font-medium text-white">{profile?.name || "TV Doutor"}</p>
                  <p className="text-xs text-blue-100">{profile?.email || "suporte@tvdoutor.com.br"}</p>
                </div>
              </div>

              {/* Botão para mudar foto */}
              <div className="px-4 py-3 bg-orange-500 hover:bg-orange-600 transition-colors">
                <Button
                  variant="ghost"
                  className="w-full text-white hover:text-white hover:bg-orange-600 p-0 h-auto font-medium"
                  onClick={handleChangeProfilePhoto}
                >
                  Mude Sua Foto de Perfil!
                </Button>
              </div>

              {/* Opções do menu */}
              <div className="py-2">
                <DropdownMenuItem 
                  className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={handleSettings}
                >
                  <Settings className="h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
};