import { supabase } from '@/integrations/supabase/client';

/**
 * Função para registrar um novo usuário
 * @param name Nome completo do usuário
 * @param email Email do usuário
 * @param password Senha do usuário
 * @returns Dados do usuário criado
 * @throws Error com mensagem de erro se falhar
 */
export async function registerUser(name: string, email: string, password: string) {
  // 1. Cria usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) throw new Error(authError.message);

  // 2. Se o usuário foi criado, insere na tabela profiles
  const userId = authData.user?.id;
  if (userId) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ 
        id: userId, 
        full_name: name,
        display_name: name,
        email: email
        // role: 'user' // Removido - o trigger handle_new_user já define
      }]);

    if (profileError) throw new Error(profileError.message);

    // 3. Insere também na tabela user_roles
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert([{
        user_id: userId,
        role: 'user'
      }]);

    if (roleError) throw new Error(roleError.message);
  }

  return authData;
}

/**
 * Função para fazer login
 * @param email Email do usuário
 * @param password Senha do usuário
 * @returns Dados da sessão
 * @throws Error com mensagem de erro se falhar
 */
export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Função para fazer logout
 * @throws Error com mensagem de erro se falhar
 */
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Função para resetar senha
 * @param email Email do usuário
 * @throws Error com mensagem de erro se falhar
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });

  if (error) {
    throw new Error(error.message);
  }
}
