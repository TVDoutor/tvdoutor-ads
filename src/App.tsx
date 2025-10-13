import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { startEmailProcessing } from "@/lib/email-service";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import SearchResults from "./pages/SearchResults";
import NewProposal from "./pages/NewProposal";
import Propostas from "./pages/Propostas";
import ProposalDetails from "./pages/ProposalDetails";
import InteractiveMap from "./pages/InteractiveMap";
import Inventory from "./pages/Inventory";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Venues from "./pages/Venues";
import VenueDetails from "./pages/VenueDetails";
import Campaigns from "./pages/Campaigns";
import CampaignDetails from "./pages/CampaignDetails";
import Agencias from "./pages/Agencias";
import AgenciasProjetos from "./pages/AgenciasProjetos";
import ProjectManagement from "./pages/ProjectManagement";
import PessoasProjeto from "./pages/PessoasProjeto";
import HeatmapPage from "./pages/HeatmapPage";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Inicializar sistema de email após o app carregar (não bloquear)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        startEmailProcessing();
      } catch (error) {
        console.warn('⚠️ Erro ao inicializar sistema de email (não crítico):', error);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Rota pública da landing page */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Rota pública de resultados de busca */}
            <Route path="/resultados" element={<SearchResults />} />
            
            {/* Rota pública de login */}
            <Route path="/login" element={<Login />} />
            
            {/* Rota pública de reset de senha */}
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Rotas protegidas - Dashboard */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            
            <Route path="/nova-proposta" element={
              <ProtectedRoute>
                <NewProposal />
              </ProtectedRoute>
            } />
            
            <Route path="/propostas" element={
              <ProtectedRoute>
                <Propostas />
              </ProtectedRoute>
            } />
            
            <Route path="/propostas/:id" element={
              <ProtectedRoute>
                <ProposalDetails />
              </ProtectedRoute>
            } />
            
            <Route path="/mapa-interativo" element={
              <ProtectedRoute>
                <InteractiveMap />
              </ProtectedRoute>
            } />
            
            <Route path="/heatmap" element={
              <ProtectedRoute>
                <HeatmapPage />
              </ProtectedRoute>
            } />
            
            <Route path="/inventory" element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            } />
            
            <Route path="/user-management" element={
              <ProtectedRoute requiredRole="super_admin">
                <UserManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* Rotas com controle de acesso por role */}
            <Route path="/campaigns" element={
              <ProtectedRoute requiredRole="manager">
                <Campaigns />
              </ProtectedRoute>
            } />
            
            <Route path="/campaigns/:id" element={
              <ProtectedRoute requiredRole="manager">
                <CampaignDetails />
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute requiredRole="manager">
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="/venues" element={
              <ProtectedRoute requiredRole="manager">
                <Venues />
              </ProtectedRoute>
            } />
            
            <Route path="/venues/:id" element={
              <ProtectedRoute requiredRole="manager">
                <VenueDetails />
              </ProtectedRoute>
            } />
            
            <Route path="/agencias" element={
              <ProtectedRoute requiredRole="manager">
                <Agencias />
              </ProtectedRoute>
            } />
            
            <Route path="/agencias/projetos" element={
              <ProtectedRoute requiredRole="manager">
                <AgenciasProjetos />
              </ProtectedRoute>
            } />
            
            <Route path="/gerenciamento-projetos" element={
              <ProtectedRoute requiredRole="manager">
                <ProjectManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/users" element={
              <ProtectedRoute requiredRole="admin">
                <Users />
              </ProtectedRoute>
            } />
            
            <Route path="/pessoas-projeto" element={
              <ProtectedRoute requiredRole="admin">
                <PessoasProjeto />
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
};

export default App;
