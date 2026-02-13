import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <DashboardLayout>
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-8">
            <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Página não encontrada</h1>
            <p className="text-gray-600 mb-6">
              A página que você está procurando não existe ou foi movida.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            
            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full gap-2"
            >
              <Home className="w-4 h-4" />
              Ir para o Dashboard
            </Button>
          </div>

          <div className="mt-6 text-sm text-gray-500">
            URL: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{location.pathname}</code>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NotFound;
