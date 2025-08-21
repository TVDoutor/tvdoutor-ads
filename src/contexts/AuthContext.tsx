import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
      return 'Admin'; // Super Admin vira Admin no frontend
    case 'admin':
      return 'Manager'; // Admin vira Manager no frontend
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

  const fetchUserProfile = async (userId: string) => {
    try {
      // Buscar perfil do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      // Buscar roles do usuário
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Determinar o role mais alto do usuário
      let userRole: UserRole = 'User';
      if (rolesData && rolesData.length > 0) {
        const roles = rolesData.map(r => r.role);
        if (roles.includes('super_admin')) {
          userRole = 'Admin';
        } else if (roles.includes('admin')) {
          userRole = 'Manager';
        } else {
          userRole = 'User';
        }
      }

      return {
        id: profileData.id,
        name: profileData.full_name || profileData.email || 'Usuário',
        email: profileData.email || '',
        role: userRole,
        avatar: profileData.avatar_url
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id).then(setProfile);
      }
      
      setLoading(false);
    });

    // Escutar mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Call ensure_profile after OAuth login/redirect
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          try {
            await supabase.rpc('ensure_profile');
          } catch (error) {
            console.error('Error ensuring profile:', error);
          }
        }
        
        const userProfile = await fetchUserProfile(session.user.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
      console.error('Sign in error:', error);
      return { error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive"
        });
      } else if (data.user) {
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para ativar a conta."
        });
      }

      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
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
      console.error('Google sign in error:', error);
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
      console.error('Reset password error:', error);
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
      console.error('Sign out error:', error);
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
