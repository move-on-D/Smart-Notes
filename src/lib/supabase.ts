import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('SN_SUPABASE_URL') || 'https://abhobfcnliygvcgwvbav.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('SN_SUPABASE_ANON_KEY') || 'sb_publishable_L3Pw1RQFPeacd45Cz8yZpQ_bua-tEjq';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;

export const saveSupabaseCredentials = (url: string, key: string) => {
  localStorage.setItem('SN_SUPABASE_URL', url.trim());
  localStorage.setItem('SN_SUPABASE_ANON_KEY', key.trim());
  window.location.reload();
};

// Authentication Helpers
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata: { fullName: string; phoneNumber?: string }
) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: metadata.fullName,
        phone_number: metadata.phoneNumber || '',
      }
    }
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
