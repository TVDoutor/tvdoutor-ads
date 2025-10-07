// @ts-nocheck
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

  // O trigger handle_new_user criará automaticamente:
  // - O perfil na tabela profiles
  // - A role 'user' na tabela user_roles
  // Não é necessário criar manualmente

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
