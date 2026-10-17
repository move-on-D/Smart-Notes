import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('SN_SUPABASE_URL') || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('SN_SUPABASE_ANON_KEY') || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const saveSupabaseCredentials = (url: string, key: string) => {
  localStorage.setItem('SN_SUPABASE_URL', url.trim());
  localStorage.setItem('SN_SUPABASE_ANON_KEY', key.trim());
  window.location.reload();
};
