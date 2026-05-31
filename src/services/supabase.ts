import { createClient } from '@supabase/supabase-js';

const fallbackSupabaseUrl = 'https://jttskourgvhhyjcurmrr.supabase.co';
const fallbackSupabaseAnonKey = 'sb_publishable_bxwCSlfrUtB2rTJvZtwW6Q_HXU64Qso';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? fallbackSupabaseUrl;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? fallbackSupabaseAnonKey;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const adminLoginEmail = (import.meta.env.VITE_ADMIN_LOGIN_EMAIL as string | undefined) ?? 'sushmitp1@gmail.com';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
