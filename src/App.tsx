import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NewProposal from "./pages/NewProposal";
import InteractiveMap from "./pages/InteractiveMap";
import Inventory from "./pages/Inventory";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Rota pública de login */}
            <Route path="/login" element={<Login />} />
            
            {/* Rotas protegidas */}
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            
            <Route path="/nova-proposta" element={
              <ProtectedRoute>
                <NewProposal />
              </ProtectedRoute>
            } />
            
            <Route path="/mapa-interativo" element={
              <ProtectedRoute>
                <InteractiveMap />
              </ProtectedRoute>
            } />
            
            <Route path="/inventory" element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            {/* Rotas com controle de acesso por role */}
            <Route path="/campaigns" element={
              <ProtectedRoute requiredRole="Manager">
                <div className="p-8 text-center">
                  <h1 className="text-2xl font-bold">Campanhas</h1>
                  <p className="text-muted-foreground">Página em desenvolvimento</p>
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute requiredRole="Manager">
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="/venues" element={
              <ProtectedRoute requiredRole="Manager">
                <div className="p-8 text-center">
                  <h1 className="text-2xl font-bold">Pontos de Venda</h1>
                  <p className="text-muted-foreground">Página em desenvolvimento</p>
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/users" element={
              <ProtectedRoute requiredRole="Admin">
                <Users />
              </ProtectedRoute>
            } />
            
            {/* Rota 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
