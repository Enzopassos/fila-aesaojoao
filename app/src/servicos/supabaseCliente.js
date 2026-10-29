import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vfyygxjoxavesohtmrhm.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_yX8u5qXvtGpoR7M8sKzhPA_S66rYT5T';

export const SISTEMA_ID =
  process.env.EXPO_PUBLIC_SISTEMA_ID || '727d0fa8-79dd-4b93-86d5-615ed194f269';
export const SISTEMA_SLUG =
  process.env.EXPO_PUBLIC_SISTEMA_SLUG || 'fila-aesaojoao';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Atenção: EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY não configuradas.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

