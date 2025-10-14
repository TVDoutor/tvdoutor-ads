import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { TVDoutorFooter } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { profile } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Se o usuário estiver logado, usar layout com sidebar ocupando toda a lateral
  if (profile) {
    return (
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar - Ocupa toda a lateral esquerda */}
        <div className="hidden lg:block h-full">
          <Sidebar 
            isCollapsed={isSidebarCollapsed} 
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>
        
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900">
              <Sidebar />
            </div>
            <div 
              className="absolute inset-0"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        )}
        
        {/* Main Content */}
        <main className="flex-1 h-full overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  // Layout padrão para usuários não logados
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      
      <div className="flex flex-1 h-full">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block h-full">
          <Sidebar 
            isCollapsed={isSidebarCollapsed} 
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>
        
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed left-0 top-16 bottom-0 w-64 bg-card border-r">
              <Sidebar />
            </div>
            <div 
              className="absolute inset-0"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        )}
        
        {/* Main Content */}
        <main className="flex-1 h-full overflow-auto">
          {children}
        </main>
      </div>
      
      {/* Footer */}
      <TVDoutorFooter />
    </div>
  );
};