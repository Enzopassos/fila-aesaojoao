import { createClient } from '@supabase/supabase-js';

const obterVariavelAmbiente = (chave) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[chave]) {
    return import.meta.env[chave];
  }
  if (typeof process !== 'undefined' && process.env && process.env[chave]) {
    return process.env[chave];
  }
  return undefined;
};

const supabaseUrl = obterVariavelAmbiente('VITE_SUPABASE_URL');
const supabaseAnonKey = obterVariavelAmbiente('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Atenção: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas no .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const SISTEMA_ID = obterVariavelAmbiente('VITE_SISTEMA_ID') || '5632354f-852d-451d-96b2-11fc82c56814';
export const SISTEMA_SLUG = obterVariavelAmbiente('VITE_SISTEMA_SLUG') || 'fila-aesaojoao';

/**
 * Cria uma instância de cliente Supabase temporária e isolada sem persistência de sessão.
 * Permite que um administrador crie novos usuários via auth.signUp sem ser desconectado.
 */
export function criarClienteIsolado() {
  return createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
