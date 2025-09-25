import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";
import { usePasswordSecurity } from "@/lib/password-security";
import { useRateLimit } from "@/lib/rate-limiting";
import { 
  Tv, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff,
  ArrowLeft
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({ isValid: false, feedback: [] });
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { validatePassword, getStrengthTips } = usePasswordSecurity();
  const { checkLimit, getPreset } = useRateLimit();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(loginForm.email, loginForm.password);
    
    if (!error) {
      navigate(from, { replace: true });
    }
    
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerForm.password !== registerForm.confirmPassword) {
      return;
    }

    setIsLoading(true);
    
    const { error } = await signUp(registerForm.email, registerForm.password, registerForm.name);
    
    if (!error) {
      // Limpar formulário após sucesso
      setRegisterForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
      });
    }
    
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  const handleForgotPassword = () => {
    setShowForgotPasswordModal(true);
  };

  return (
    <div className="min-h-screen medical-accent-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link to="/" className="inline-flex items-center text-sm text-white hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao início
          </Link>
          
          <div className="flex justify-center">
            <div className="medical-gradient p-4 rounded-2xl">
              <Tv className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-foreground">TV Doutor</h1>
            <p className="text-white">Plataforma de Anúncios Médicos</p>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="medical-glow">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-foreground">Acesse sua conta</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 medical-glow">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-white" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10 medical-glow"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-white" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Sua senha"
                        className="pl-10 pr-10 medical-glow"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        required
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

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      />
                      <Label htmlFor="remember" className="text-sm">Lembrar de mim</Label>
                    </div>
                    <Button 
                      type="button" 
                      variant="link" 
                      className="p-0 h-auto text-sm"
                      onClick={handleForgotPassword}
                    >
                      Esqueceu a senha?
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full medical-gradient text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <Separator className="flex-1" />
                    <span className="px-3 text-xs text-white">OU</span>
                    <Separator className="flex-1" />
                  </div>

                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full medical-glow"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar com Google
                  </Button>
                </div>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-white" />
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Seu nome completo"
                        className="pl-10 medical-glow"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-white" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10 medical-glow"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-white" />
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Crie uma senha forte"
                        className="pl-10 pr-10 medical-glow"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                        required
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
                    <Label htmlFor="register-confirm-password">Confirmar senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-white" />
                      <Input
                        id="register-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirme sua senha"
                        className="pl-10 pr-10 medical-glow"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                        required
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

                  <div className="flex items-start space-x-2">
                    <Checkbox id="terms" className="mt-1" />
                    <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                      Ao criar uma conta, você concorda com nossos{" "}
                      <Button variant="link" className="p-0 h-auto text-sm">
                        Termos de Uso
                      </Button>{" "}
                      e{" "}
                      <Button variant="link" className="p-0 h-auto text-sm">
                        Política de Privacidade
                      </Button>
                    </Label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full medical-gradient text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? "Criando conta..." : "Criar conta"}
                  </Button>
                </form>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <Separator className="flex-1" />
                    <span className="px-3 text-xs text-white">OU</span>
                    <Separator className="flex-1" />
                  </div>

                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full medical-glow"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Cadastrar com Google
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-white">
          <p>© 2025 TV Doutor. Todos os direitos reservados.</p>
          <p className="mt-1">Plataforma de comunicação em saúde e bem-estar</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </div>
  );
};

export default Login;
