import { createClient } from '@supabase/supabase-js';

// Credenciais do Projeto ProVendas
// Nota: Em Vite, usamos import.meta.env. Usamos um fallback seguro {} caso env esteja undefined.

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {} as any;

const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://fdkvidfejccnwbdonquu.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DMmNqzjYZ8xG5sQlRawZAw_EJoCj64S';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);