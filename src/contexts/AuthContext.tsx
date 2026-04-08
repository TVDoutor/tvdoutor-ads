import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logDebug, logWarn, logError, logAuthSuccess, logAuthError } from '@/utils/secureLogger';
import { userSessionService } from '@/lib/user-session-service';
import { getAllowedSignupDomain, isAllowedSignupEmail } from '@/lib/allowed-email-domain';

// Mapeamento de roles do banco para o frontend
export type UserRole = 'user' | 'client' | 'manager' | 'admin' | 'super_admin';

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
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
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
      return 'super_admin'; // Super Administrador: Acesso total ao sistema
    case 'admin':
      return 'admin'; // Administrador: Acesso administrativo
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
      
      // CORREÇÃO ESPECÍFICA PARA HILDEBRANDO - Buscar dados diretamente sem RLS
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (user.email === 'hildebrando.cardoso@tvdoutor.com.br' || user.id === '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3')) {
        logDebug('Usuário específico detectado - usando fallback direto');
        return {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hildebrando',
          email: user.email || '',
          role: 'super_admin',
          avatar: user.user_metadata?.avatar_url
        };
      }
      
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
        .order('role', { ascending: false }); // Buscar todas as roles, ordenadas por hierarquia

      // Timeout de 15 segundos para as consultas (aumentado)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 15000);
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
          
          // Se o email for do hildebrando ou ID específico, forçar role super_admin
          if (user.email === 'hildebrando.cardoso@tvdoutor.com.br' || 
              user.id === '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3') {
            logDebug('Forçando role super_admin para usuário específico', { userId: user.id });
            fallbackRole = 'super_admin';
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
            fallbackRole = 'super_admin';
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
        userRole = 'super_admin';
        logDebug('Usuário identificado como super_admin via campo booleano');
      } else if (roleData && !roleError) {
        // Se há múltiplas roles, usar a mais alta na hierarquia
        const roles = Array.isArray(roleData) ? roleData : [roleData];
        const highestRole = roles.reduce((highest, current) => {
          const currentRole = mapDatabaseRoleToUserRole(current.role || 'user');
          const highestRole = mapDatabaseRoleToUserRole(highest.role || 'user');
          
          // Hierarquia: super_admin > admin > manager > client > user
          const hierarchy = { super_admin: 5, admin: 4, manager: 3, client: 2, user: 1 };
          return hierarchy[currentRole] > hierarchy[highestRole] ? current : highest;
        });
        
        userRole = mapDatabaseRoleToUserRole(highestRole.role || 'user');
        logDebug('Role obtido da tabela user_roles', { 
          allRoles: roles.map(r => r.role), 
          selectedRole: highestRole.role, 
          mappedRole: userRole 
        });
      }
      
      // Fallback: profiles.role (alguns usuários têm role apenas em profiles, ex: Rose/Gerente)
      if (userRole === 'user' && profileData.role && ['admin', 'super_admin', 'manager', 'client'].includes(String(profileData.role))) {
        userRole = mapDatabaseRoleToUserRole(String(profileData.role));
        logDebug('Role obtido de profiles.role (fallback)', { profileRole: profileData.role, mappedRole: userRole });
      }
      
      // Fallback especial para hildebrando e outros super_admins
      if ((profileData.email === 'hildebrando.cardoso@tvdoutor.com.br' || 
           profileData.id === '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3') && userRole !== 'super_admin') {
        logDebug('Forçando role super_admin para usuário específico (fallback)', { userId: profileData.id });
        userRole = 'super_admin';
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
                
                // Inicializar sessão para rastreamento no monitor (não bloqueia o fluxo)
                userSessionService.initializeSession().catch((error) => {
                  console.warn('Erro ao inicializar sessão de usuário (não crítico):', error);
                });
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
        // NÃO limpar dados do usuário - apenas parar o loading
        // O usuário pode estar logado mas o perfil ainda carregando
        setLoading(false);
      }
    }, 10000); // 10 segundos (aumentado)

    initializeAuth();

    // Escutar mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Inicializar sessão imediatamente (não esperar profile) para rastreamento no monitor
        userSessionService.initializeSession().catch((err) => {
          console.warn('Erro ao inicializar sessão no auth change (não crítico):', err);
        });

        // Call ensure_profile after OAuth login/redirect
        // O trigger handle_new_user cria automaticamente o profile e role
        // Não é necessário fazer upsert manual
        
        setTimeout(async () => {
          try {
            const userProfile = await fetchUserProfile(session.user.id);
            if (mounted) {
              setProfile(userProfile);
              logDebug('Profile loaded on auth change', { 
                hasProfile: !!userProfile, 
                role: userProfile?.role 
              });
            }
          } catch (error) {
            logError('Error fetching profile on auth change', error);
            // Tentar fallback para usuário específico
            if (session.user.email === 'hildebrando.cardoso@tvdoutor.com.br' || 
                session.user.id === '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3') {
              logDebug('Using fallback profile for specific user');
              if (mounted) {
                setProfile({
                  id: session.user.id,
                  name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário',
                  email: session.user.email || '',
                  role: 'super_admin',
                  avatar: session.user.user_metadata?.avatar_url
                });
              }
            } else if (mounted) {
              setProfile(null);
            }
          }
        }, 1000); // Aumentar delay para 1 segundo
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

      if (!isAllowedSignupEmail(email)) {
        toast({
          title: "Cadastro temporariamente restrito",
          description: `Novos cadastros aceitam apenas emails @${getAllowedSignupDomain()}.`,
          variant: "destructive"
        });
        return { error: new Error('Signup restricted to company domain') as AuthError };
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

  const updatePassword = async (newPassword: string) => {
    try {
      logDebug('Iniciando atualização de senha');
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        logAuthError('Password update error', error);
        toast({
          title: "Erro ao alterar senha",
          description: error.message,
          variant: "destructive"
        });
      } else {
        logAuthSuccess('Password updated successfully');
        toast({
          title: "Senha alterada!",
          description: "Sua senha foi atualizada com sucesso."
        });
      }

      return { error };
    } catch (error) {
      logError('Update password error', error);
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      // Finaliza sessão ativa no monitoramento antes do logout
      await userSessionService.endSession();
      
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
    
    // Super Admin tem acesso a tudo
    if (profile.role === 'super_admin' || (profile as any)?.super_admin === true) return true;
    
    // Admin tem acesso a admin, manager, client, user
    if (profile.role === 'admin' && (role === 'admin' || role === 'manager' || role === 'client' || role === 'user')) return true;
    
    // Manager tem acesso a manager, client e user
    if (profile.role === 'manager' && (role === 'manager' || role === 'client' || role === 'user')) return true;
    
    // User tem acesso a user e client
    if (profile.role === 'user' && (role === 'user' || role === 'client')) return true;
    
    // Client só tem acesso a client
    return profile.role === role;
  };

  const isAdmin = (): boolean => {
    if (!profile) {
      logDebug('isAdmin: No profile available', { hasProfile: !!profile });
      return false;
    }
    
    // Verificar se é super_admin (tanto pelo campo boolean quanto pelo role)
    const isSuperAdmin = (profile as any)?.super_admin === true || profile.role === 'super_admin';
    // Admin normal (não super_admin)
    const isAdminRole = profile.role === 'admin' && !isSuperAdmin;
    const result = isSuperAdmin || isAdminRole;
    
    logDebug('isAdmin check', { 
      role: profile.role, 
      isAdminRole, 
      isSuperAdmin, 
      result,
      profileId: profile.id 
    });
    
    return result;
  };

  const isSuperAdmin = (): boolean => {
    if (!profile) return false;
    
    // Verificar se é super_admin (tanto pelo campo boolean quanto pelo role)
    return (profile as any)?.super_admin === true || profile.role === 'super_admin';
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
    updatePassword,
    signOut,
    hasRole,
    isAdmin,
    isSuperAdmin,
    isManager,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

