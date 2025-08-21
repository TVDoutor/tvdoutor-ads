import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Verificar se há tokens de reset na URL (tanto query params quanto hash fragments)
        let accessToken = searchParams.get('access_token');
        let refreshToken = searchParams.get('refresh_token');
        
        // Se não encontrou nos query params, verificar no hash
        if (!accessToken && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }
        
        if (accessToken && refreshToken) {
          // Configurar a sessão com os tokens do email
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (!error) {
            setIsValidSession(true);
            // Limpar a URL para remover os tokens sensíveis
            window.history.replaceState({}, document.title, '/reset-password');
          } else {
            toast({
              title: "Link inválido",
              description: "O link de recuperação é inválido ou expirou.",
              variant: "destructive"
            });
            navigate('/login');
          }
        } else {
          // Verificar se já existe uma sessão válida para reset
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsValidSession(true);
          } else {
            toast({
              title: "Acesso negado",
              description: "Você precisa de um link válido para redefinir sua senha.",
              variant: "destructive"
            });
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        navigate('/login');
      } finally {
        setIsCheckingSession(false);
      }
    };

    initializeSession();
  }, [searchParams, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setIsSuccess(true);
        toast({
          title: "Sucesso!",
          description: "Sua senha foi alterada com sucesso."
        });
        
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  // Loading state enquanto verifica a sessão
  if (isCheckingSession) {
    return (
      <div className="min-h-screen medical-accent-gradient flex items-center justify-center p-4">
        <Card className="w-full max-w-md medical-glow">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full medical-gradient flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary-foreground animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Verificando link...</h2>
              <p className="text-muted-foreground">Aguarde um momento</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se a sessão não é válida, o useEffect já redireciona
  if (!isValidSession) {
    return null;
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen medical-accent-gradient flex items-center justify-center p-4">
        <Card className="w-full max-w-md medical-glow">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Senha Alterada!</h2>
              <p className="text-muted-foreground">
                Sua senha foi alterada com sucesso. Você será redirecionado para a página de login em alguns segundos.
              </p>
            </div>

            <Button asChild className="medical-gradient text-primary-foreground">
              <Link to="/login">Ir para Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen medical-accent-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Button variant="ghost" size="sm" asChild className="absolute top-4 left-4">
            <Link to="/login">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          
          <div className="w-16 h-16 mx-auto rounded-full medical-gradient flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Redefinir Senha</h1>
          <p className="text-muted-foreground">Digite sua nova senha</p>
        </div>

        {/* Reset Password Form */}
        <Card className="medical-glow">
          <CardHeader>
            <CardTitle className="text-center">Nova Senha</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua nova senha"
                    className="pl-10 pr-10 medical-glow"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua nova senha"
                    className="pl-10 pr-10 medical-glow"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full medical-gradient text-primary-foreground"
                  disabled={isLoading || !password || !confirmPassword}
                >
                  {isLoading ? "Alterando..." : "Alterar Senha"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>© 2024 TV Doutor. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
