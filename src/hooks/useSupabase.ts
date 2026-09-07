import { useState, useEffect, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, SavedSimulationPreset } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    const currentOrigin = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: currentOrigin,
      },
    });
    if (error) throw error;
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet.');
    }
    const currentOrigin = window.location.origin + window.location.pathname;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: currentOrigin,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'github' | 'google') => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet.');
    }
    const currentOrigin = window.location.origin + window.location.pathname;
    
    // In iframe preview environments (e.g. AI Studio preview), GitHub and Google
    // send 'X-Frame-Options: DENY', which causes 'github.com refused to connect' if redirected inside the iframe.
    // We request the OAuth URL with skipBrowserRedirect: true and open it in a top-level tab/popup.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: currentOrigin,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (data?.url) {
      // Open in a new top-level window/tab so GitHub allows login
      window.open(data.url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return {
    user,
    session,
    loading,
    isConfigured: isSupabaseConfigured,
    signInWithEmail,
    signInWithPassword,
    signUpWithPassword,
    signInWithOAuth,
    signOut,
  };
}

export function usePresets(labId?: string) {
  const { user, isConfigured } = useAuth();
  const [presets, setPresets] = useState<SavedSimulationPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPresets = useCallback(async () => {
    if (!isConfigured || !user) {
      setPresets([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('simulation_presets')
        .select('*')
        .order('created_at', { ascending: false });

      if (labId) {
        query = query.eq('lab_id', labId);
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      setPresets(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch saved presets');
    } finally {
      setLoading(false);
    }
  }, [isConfigured, user, labId]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const savePreset = useCallback(async (title: string, parameters: Record<string, any>, currentLabId: string, notes?: string) => {
    if (!isConfigured || !user) {
      throw new Error('You must be signed in to save presets to the cloud.');
    }

    const { data, error: insertErr } = await supabase
      .from('simulation_presets')
      .insert({
        user_id: user.id,
        lab_id: currentLabId,
        title,
        notes: notes || '',
        parameters,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;
    setPresets((prev) => [data, ...prev]);
    return data;
  }, [isConfigured, user]);

  const deletePreset = useCallback(async (id: string) => {
    if (!isConfigured || !user) return;
    const { error: delErr } = await supabase
      .from('simulation_presets')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, [isConfigured, user]);

  return {
    presets,
    loading,
    error,
    refresh: fetchPresets,
    savePreset,
    deletePreset,
  };
}
