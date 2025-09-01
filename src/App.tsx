import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import NewProposal from "./pages/NewProposal";
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
            {/* Rota pública da landing page */}
            <Route path="/" element={<LandingPage />} />
            
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
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* Rotas com controle de acesso por role */}
            <Route path="/campaigns" element={
              <ProtectedRoute requiredRole="Manager">
                <Campaigns />
              </ProtectedRoute>
            } />
            
            <Route path="/campaigns/:id" element={
              <ProtectedRoute requiredRole="Manager">
                <CampaignDetails />
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute requiredRole="Manager">
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="/venues" element={
              <ProtectedRoute requiredRole="Manager">
                <Venues />
              </ProtectedRoute>
            } />
            
            <Route path="/venues/:id" element={
              <ProtectedRoute requiredRole="Manager">
                <VenueDetails />
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
