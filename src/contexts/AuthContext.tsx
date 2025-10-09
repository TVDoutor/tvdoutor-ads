import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logDebug, logWarn, logError, logAuthSuccess, logAuthError } from '@/utils/secureLogger';

// Mapeamento de roles do banco para o frontend
export type UserRole = 'user' | 'client' | 'manager' | 'admin';

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
    case 'admin':
      return 'admin'; // Administrador: Acesso total ao sistema
    case 'manager':
      return 'manager'; // Gerente: Pode criar, ler e editar, mas não pode excluir
    case 'client':
      return 'client'; // Cliente: Acesso para visualizar propostas e projetos atribuídos
    case 'user':
    default:
      return 'user'; // Usuário: Acesso padrão à plataforma
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
        .limit(1)
        .maybeSingle();

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
      
      // Log dos erros para debug
      if (profileError) {
        logError('Profile fetch error', profileError);
      }
      if (roleError) {
        logError('Role fetch error', roleError);
      }
      
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
          let fallbackRole: UserRole = 'user';
          
          // Se o email for do hildebrando ou ID específico, forçar role admin
          if (user.email === 'hildebrando.cardoso@tvdoutor.com.br' || 
              user.id === '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3') {
            logDebug('Forçando role admin para usuário específico', { userId: user.id });
            fallbackRole = 'admin';
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

      // Se não conseguir buscar o perfil, mas não há erro, usar fallback também
      if (!profileData) {
        logWarn('Profile data is null, using fallback');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          let fallbackRole: UserRole = 'user';
          
          if (user.email === 'hildebrando.cardoso@tvdoutor.com.br' || 
              user.id === '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3') {
            fallbackRole = 'admin';
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
      let userRole: UserRole = 'user';
      
      // Verificar primeiro se é super admin (campo booleano na tabela profiles)
      if (profileData.super_admin === true) {
        userRole = 'admin';
        logDebug('Usuário identificado como super_admin via campo booleano');
      } else if (roleData && !roleError) {
        // Usar role da tabela user_roles
        userRole = mapDatabaseRoleToUserRole(roleData.role || 'user');
        logDebug('Role obtido da tabela user_roles', { role: roleData.role, mappedRole: userRole });
      }
      
      // Fallback especial para hildebrando e outros admins
      if ((profileData.email === 'hildebrando.cardoso@tvdoutor.com.br' || 
           profileData.id === '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3') && userRole !== 'admin') {
        logDebug('Forçando role admin para usuário específico (fallback)', { userId: profileData.id });
        userRole = 'admin';
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
            role: 'user',
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
      console.log('🔵 ==================== INÍCIO DO SIGNUP ====================');
      console.log('📧 Email:', email);
      console.log('👤 Nome:', name);
      logDebug('Iniciando processo de cadastro', { email, hasName: !!name });
      
      // Verificar se as variáveis de ambiente estão configuradas
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.error('❌ Variáveis de ambiente não configuradas');
        logAuthError('Variáveis de ambiente não configuradas');
        toast({
          title: "Erro de configuração",
          description: "Configuração do servidor incompleta. Contate o administrador.",
          variant: "destructive"
        });
        return { error: new Error('Environment variables not configured') as AuthError };
      }
      
      console.log('🔧 Chamando supabase.auth.signUp...');
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
        console.error('❌ Erro no signup do Supabase:', error);
        logAuthError('Erro no signup do Supabase', error);
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      if (data.user) {
        console.log('✅ Usuário criado com sucesso no auth.users');
        console.log('   User ID:', data.user.id);
        console.log('   Email:', data.user.email);
        console.log('   Email confirmado:', data.user.email_confirmed_at ? 'Sim' : 'Não');
        logDebug('Usuário criado com sucesso', { userId: data.user.id });
        
        console.log('⏳ Aguardando trigger handle_new_user criar profile e role...');
        
        // Aguardar um pouco para o trigger executar
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar se o profile foi criado
        console.log('🔍 Verificando se profile foi criado...');
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, super_admin')
            .eq('id', data.user.id)
            .single();
          
          if (profileError) {
            console.error('❌ Erro ao buscar profile:', profileError);
            console.log('   Código:', profileError.code);
            console.log('   Mensagem:', profileError.message);
            console.log('   Detalhes:', profileError.details);
          } else if (profileData) {
            console.log('✅ Profile criado com sucesso');
            console.log('   ID:', profileData.id);
            console.log('   Email:', profileData.email);
            console.log('   Nome:', profileData.full_name);
            console.log('   Super Admin:', profileData.super_admin ? 'Sim' : 'Não');
          } else {
            console.warn('⚠️ Profile não encontrado (pode estar sendo criado)');
          }
        } catch (profileCheckError) {
          console.error('❌ Erro ao verificar profile:', profileCheckError);
        }
        
        // Verificar se a role foi atribuída
        console.log('🔍 Verificando se role foi atribuída...');
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .eq('user_id', data.user.id);
          
          if (roleError) {
            console.error('❌ Erro ao buscar role:', roleError);
            console.log('   Código:', roleError.code);
            console.log('   Mensagem:', roleError.message);
            console.log('   Detalhes:', roleError.details);
          } else if (roleData && roleData.length > 0) {
            console.log('✅ Role atribuída com sucesso');
            console.log('   User ID:', roleData[0].user_id);
            console.log('   Role:', roleData[0].role);
            roleData.forEach((role, index) => {
              if (index > 0) {
                console.log(`   Role adicional [${index}]:`, role.role);
              }
            });
          } else {
            console.warn('⚠️ Nenhuma role encontrada (pode estar sendo criada)');
          }
        } catch (roleCheckError) {
          console.error('❌ Erro ao verificar role:', roleCheckError);
        }
        
        console.log('🔵 ==================== FIM DO SIGNUP ====================');
        
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para ativar a conta."
        });
      } else {
        console.warn('⚠️ Signup retornou sucesso mas sem usuário');
        logWarn('Signup retornou sucesso mas sem usuário');
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para ativar a conta."
        });
      }

      return { error: null };
    } catch (error) {
      console.error('❌ Erro crítico no signup:', error);
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
    if (profile.role === 'admin') return true;
    
    // Manager tem acesso a manager, client e user
    if (profile.role === 'manager' && (role === 'manager' || role === 'client' || role === 'user')) return true;
    
    // Client tem acesso a client e user
    if (profile.role === 'client' && (role === 'client' || role === 'user')) return true;
    
    // User só tem acesso a user
    return profile.role === role;
  };

  const isAdmin = (): boolean => {
    if (!profile) return false;
    // Verificar tanto role 'admin' quanto super_admin
    return profile.role === 'admin' || (profile as any)?.super_admin === true;
  };

  const isManager = (): boolean => {
    return profile?.role === 'manager' || profile?.role === 'admin';
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

