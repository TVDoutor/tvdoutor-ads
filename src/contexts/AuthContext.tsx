import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logDebug, logWarn, logError, logAuthSuccess, logAuthError } from '@/utils/secureLogger';

// Mapeamento de roles do banco para o frontend
export type UserRole = 'User' | 'Manager' | 'Admin';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Função para mapear roles do banco para o frontend
const mapDatabaseRoleToUserRole = (dbRole: string): UserRole => {
  switch (dbRole) {
    case 'super_admin':
    case 'admin': // Admin users now have super_admin permissions
      return 'Admin'; // Both super_admin and admin become Admin in frontend
    case 'manager':
      return 'Manager'; // Manager stays Manager
    case 'user':
    default:
      return 'User';
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      logDebug('Buscando perfil do usuário');
      
      // Buscar perfil e role usando a nova estrutura
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId as any)
        .single();

      const rolePromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId as any)
        .order('role', { ascending: true })
        .limit(1);

      // Timeout de 10 segundos para as consultas
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000);
      });

      const [profileResult, roleResult] = await Promise.race([
        Promise.all([profilePromise, rolePromise]),
        timeoutPromise
      ]) as [any, any];

      const { data: profileData, error: profileError } = profileResult;
      const { data: roleData, error: roleError } = roleResult;
      
      logDebug('Resultado da busca do perfil', { 
        hasProfileData: !!profileData, 
        profileError: profileError?.message, 
        roleData, 
        roleError: roleError?.message 
      });

      // Se não conseguir buscar o perfil, usar fallback
      if (profileError) {
        logError('Erro ao buscar perfil', profileError);
        
        // Fallback: obter informações básicas do usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          let fallbackRole: UserRole = 'User';
          
          // Se o email for do hildebrando, forçar role Admin
          if (user.email === 'hildebrando.cardoso@tvdoutor.com.br') {
            logDebug('Forçando role Admin para usuário específico');
            fallbackRole = 'Admin';
          }
          
          return {
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
            email: user.email || '',
            role: fallbackRole,
            avatar: user.user_metadata?.avatar_url
          };
        }
        return null;
      }

      // Mapear o role do banco para o frontend
      let userRole: UserRole = 'User';
      
      // Verificar primeiro se é super admin (campo booleano na tabela profiles)
      if (profileData.super_admin === true) {
        userRole = 'Admin';
        logDebug('Usuário identificado como super_admin via campo booleano');
      } else if (roleData && roleData.length > 0 && !roleError) {
        // Usar role da tabela user_roles
        userRole = mapDatabaseRoleToUserRole(roleData[0].role || 'user');
        logDebug('Role obtido da tabela user_roles', { role: roleData[0].role, mappedRole: userRole });
      }
      
      // Fallback especial para hildebrando
      if (profileData.email === 'hildebrando.cardoso@tvdoutor.com.br' && userRole !== 'Admin') {
        logDebug('Forçando role Admin para usuário específico (fallback)');
        userRole = 'Admin';
      }

      logAuthSuccess('Perfil do usuário carregado', {
        role: userRole,
        hasEmail: !!profileData.email
      });

      return {
        id: profileData.id,
        name: profileData.full_name || profileData.display_name || profileData.email || 'Usuário',
        email: profileData.email || '',
        role: userRole,
        avatar: profileData.avatar_url
      };
    } catch (error) {
      logError('Error fetching user profile', error);
      
      // Fallback: tentar obter informações básicas do usuário
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          return {
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
            email: user.email || '',
            role: 'User',
            avatar: user.user_metadata?.avatar_url
          };
        }
      } catch (fallbackError) {
        logError('Error in fallback profile fetch', fallbackError);
      }
      
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        logDebug('Inicializando autenticação...');
        
        // Don't initialize CSRF protection during auth initialization
        // It can interfere with the authentication flow
        // await createSecureSupabaseRequest();
        
        // Obter sessão inicial
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          logError('Error getting session', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          logDebug('Sessão obtida', { 
            hasSession: !!session, 
            hasUser: !!session?.user,
            userId: session?.user?.id 
          });
          
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            try {
              const userProfile = await fetchUserProfile(session.user.id);
              if (mounted) {
                setProfile(userProfile);
              }
            } catch (profileError) {
              logError('Error fetching initial profile', profileError);
              // Continue mesmo se não conseguir buscar o perfil
              if (mounted) {
                setProfile(null);
              }
            }
          }
          
          logDebug('Auth initialization completed, setting loading to false');
          setLoading(false);
        }
      } catch (error) {
        logError('Error initializing auth', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Timeout de segurança para evitar loading infinito
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        logWarn('Auth initialization timeout, setting loading to false');
        // Garantir que não há usuário fantasma
        setUser(null);
        setProfile(null);
        setSession(null);
        setLoading(false);
      }
    }, 5000); // 5 segundos (reduzido)

    initializeAuth();

    // Escutar mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Call ensure_profile after OAuth login/redirect
        // O trigger handle_new_user cria automaticamente o profile e role
        // Não é necessário fazer upsert manual
        
        setTimeout(async () => {
          try {
            const userProfile = await fetchUserProfile(session.user.id);
            if (mounted) {
              setProfile(userProfile);
            }
          } catch (error) {
            logError('Error fetching profile on auth change', error);
            if (mounted) {
              setProfile(null);
            }
          }
        }, 0);
      } else {
        setProfile(null);
      }
      
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Login realizado!",
          description: "Bem-vindo à plataforma TV Doutor."
        });
      }

      return { error };
    } catch (error) {
      logAuthError('Sign in error', error);
      return { error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      logDebug('Iniciando processo de cadastro', { email, hasName: !!name });
      
      // Verificar se as variáveis de ambiente estão configuradas
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        logAuthError('Variáveis de ambiente não configuradas');
        toast({
          title: "Erro de configuração",
          description: "Configuração do servidor incompleta. Contate o administrador.",
          variant: "destructive"
        });
        return { error: new Error('Environment variables not configured') as AuthError };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: name,
          }
        }
      });

      if (error) {
        logAuthError('Erro no signup do Supabase', error);
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      if (data.user) {
        logDebug('Usuário criado com sucesso', { userId: data.user.id });
        
        // O trigger handle_new_user cria automaticamente o perfil e role
        
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para ativar a conta."
        });
      } else {
        logWarn('Signup retornou sucesso mas sem usuário');
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para ativar a conta."
        });
      }

      return { error: null };
    } catch (error) {
      logAuthError('Sign up error', error);
      toast({
        title: "Erro no cadastro", 
        description: "Erro interno do servidor. Tente novamente.",
        variant: "destructive"
      });
      return { error: error as AuthError };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive"
        });
      }

      return { error };
    } catch (error) {
      logAuthError('Google sign in error', error);
      return { error: error as AuthError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        toast({
          title: "Erro na recuperação",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha."
        });
      }

      return { error };
    } catch (error) {
      logError('Reset password error', error);
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Erro ao sair",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Logout realizado",
          description: "Você foi desconectado com sucesso."
        });
      }
    } catch (error) {
      logAuthError('Sign out error', error);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    if (!profile) return false;
    
    // Admin tem acesso a tudo
    if (profile.role === 'Admin') return true;
    
    // Manager tem acesso a Manager e User
    if (profile.role === 'Manager' && (role === 'Manager' || role === 'User')) return true;
    
    // User só tem acesso a User
    return profile.role === role;
  };

  const isAdmin = (): boolean => {
    return profile?.role === 'Admin';
  };

  const isManager = (): boolean => {
    return profile?.role === 'Manager' || profile?.role === 'Admin';
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    signOut,
    hasRole,
    isAdmin,
    isManager,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

