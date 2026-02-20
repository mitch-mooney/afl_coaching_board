import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isConfigured: isSupabaseConfigured(),
  error: null,

  initialize: async () => {
    if (!supabase) {
      set({ isLoading: false, isConfigured: false });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
      });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });
      });
    } catch {
      set({ isLoading: false, error: 'Failed to initialize auth' });
    }
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: 'Supabase not configured' };

    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      set({ error: error.message });
      return { error: error.message };
    }
    return {};
  },

  signUp: async (email, password) => {
    if (!supabase) return { error: 'Supabase not configured' };

    set({ error: null });
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      set({ error: error.message });
      return { error: error.message };
    }
    return {};
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  clearError: () => set({ error: null }),
}));
