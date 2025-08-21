import { Monitor, Menu, Bell, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import logoImage from "@/assets/logo.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Logo e Menu Mobile */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <img 
              src={logoImage} 
              alt="TV Doutor ADS" 
              className="h-8 w-8 rounded-lg object-cover"
            />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-foreground">
                TV Doutor ADS
              </h1>
              <p className="text-xs text-muted-foreground">
                Digital Out-of-Home Platform
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              3
            </Badge>
          </Button>

          {/* User Menu */}
          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                    {profile.avatar ? (
                      <img 
                        src={profile.avatar} 
                        alt={profile.name} 
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.role}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Monitor className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" size="sm" onClick={handleLogin}>
              Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};