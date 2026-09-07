import { createClient } from '@supabase/supabase-js';

// Read public environment variables exposed by Vite with fallback to project URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lxpdagwjgzjttddvleku.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseUrl.trim() !== ''
);

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key'
);

export interface SavedSimulationPreset {
  id: string;
  user_id: string;
  lab_id: string;
  title: string;
  notes?: string;
  parameters: Record<string, any>;
  created_at: string;
}
