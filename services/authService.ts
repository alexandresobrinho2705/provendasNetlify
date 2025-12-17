import { supabase } from './supabaseClient';
import { User, UserRole } from '../types';

// Helper para converter o usuário do Supabase para o nosso tipo User
export const mapSupabaseUser = (u: any): User | null => {
  if (!u) return null;
  
  const metadata = u.user_metadata || {};
  
  return {
    id: u.id,
    email: u.email || '',
    name: metadata.full_name || 'Usuário',
    role: (metadata.role as UserRole) || 'Vendedor',
    avatar: metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(metadata.full_name || 'U')}&background=random`
  };
};

export const authService = {
  // Login Tradicional
  signIn: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Usuário não encontrado.');

    const mappedUser = mapSupabaseUser(data.user);
    if (!mappedUser) throw new Error('Erro ao processar dados do usuário.');
    
    return mappedUser;
  },

  // Cadastro de Nova Empresa (SaaS)
  signUpNewCompany: async (email: string, password: string, fullName: string, companyName: string): Promise<User> => {
    // Ao criar o usuário, passamos os metadados. 
    // Em um cenário real, um Trigger no Postgres criaria a linha na tabela 'companies' baseada no 'company_name'
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
          role: 'Admin', // Quem cria a conta da empresa é Admin
          is_owner: true
        }
      }
    });

    if (error) throw new Error(error.message);
    
    // Nota: Se o Supabase estiver com "Confirm Email" ligado, o user será null ou inativo até confirmar.
    if (!data.user) throw new Error('Verifique seu email para confirmar o cadastro.');

    return mapSupabaseUser(data.user)!;
  },

  // Primeiro Acesso / Esqueci a Senha
  resetPasswordForEmail: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/#/login?type=recovery',
    });
    if (error) throw new Error(error.message);
  },

  // Atualizar senha (usado após clicar no link de convite/recuperação)
  updatePassword: async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    return mapSupabaseUser(data.user);
  },

  signOut: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentSession: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ? mapSupabaseUser(session.user) : null;
  }
};