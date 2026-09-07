import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  Github, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Database,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useSupabase';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, signInWithPassword, signUpWithPassword, signInWithOAuth, signOut } = useAuth();
  
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      if (authMode === 'signup') {
        await signUpWithPassword(email, password);
        setStatusMessage({
          type: 'success',
          text: 'Account created! If email confirmation is enabled, please check your inbox.'
        });
      } else {
        await signInWithPassword(email, password);
        setStatusMessage({
          type: 'success',
          text: 'Successfully signed in!'
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Please check credentials.';
      if (msg.toLowerCase().includes('signup') && msg.toLowerCase().includes('disabled')) {
        setStatusMessage({
          type: 'error',
          text: 'Email signups are disabled in your Supabase project. Go to Supabase Dashboard -> Authentication -> Providers -> Email and turn on "Enable Email signup".'
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: msg
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuth = async (provider: 'github') => {
    setStatusMessage(null);
    try {
      await signInWithOAuth(provider);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || `Failed to initiate ${provider} sign-in.`
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-[#0d0406] border border-red-900/60 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden flex flex-col relative"
      >
        {/* Header banner */}
        <div className="flex items-center justify-between p-5 border-b border-red-950/80 bg-red-950/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-red-100 tracking-wide">
                Euler 3D Cloud Auth
              </h3>
              <p className="text-[11px] text-red-300/70 font-mono">
                Powered by Supabase Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-red-300/70 hover:text-red-100 rounded-lg hover:bg-red-900/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 space-y-5">
          {/* Missing Env Var Notice if user hasn't set keys yet */}
          {!isSupabaseConfigured && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-mono font-semibold text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Supabase Keys Required in .env</span>
              </div>
              <p className="text-amber-200/80 leading-relaxed font-sans text-[11px]">
                To activate live authentication and cloud syncing, add your project credentials to your <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200 font-mono">.env</code>:
              </p>
              <pre className="bg-[#05070a] p-2.5 rounded-lg border border-amber-500/20 text-[10px] text-red-300 font-mono overflow-x-auto select-all">
                VITE_SUPABASE_URL=https://xyz.supabase.co&#10;VITE_SUPABASE_ANON_KEY=eyJ...
              </pre>
            </div>
          )}

          {/* If already authenticated */}
          {user ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-950/20 rounded-xl border border-red-900/50 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-200 font-bold font-mono">
                  {user.email ? user.email[0].toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-red-100 truncate">
                      {user.email}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]" title="Connected" />
                  </div>
                  <div className="text-[10px] text-red-300/60 font-mono truncate">
                    UID: {user.id.slice(0, 16)}...
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase text-red-300/80 tracking-wider px-1">
                  Active Cloud Privileges:
                </div>
                <div className="p-3 bg-red-950/20 rounded-xl border border-red-900/40 text-xs space-y-1.5 text-red-200/80">
                  <div className="flex items-center gap-2 text-red-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Real-time custom simulation state persistence</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Cross-device profile synchronization</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Encrypted PostgreSQL Row-Level Security</span>
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  await signOut();
                  setStatusMessage({ type: 'success', text: 'Signed out successfully.' });
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/60 font-mono text-xs font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            /* Auth Forms */
            <div className="space-y-4">
              {/* Mode Tabs (Red Accent) */}
              <div className="flex bg-red-950/30 p-1 rounded-xl border border-red-900/50 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    authMode === 'signin' 
                      ? 'bg-red-600 text-white font-bold shadow-[0_0_12px_rgba(239,68,68,0.5)]' 
                      : 'text-red-300/70 hover:text-red-100'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    authMode === 'signup' 
                      ? 'bg-red-600 text-white font-bold shadow-[0_0_12px_rgba(239,68,68,0.5)]' 
                      : 'text-red-300/70 hover:text-red-100'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono text-red-300 mb-1">
                    Email Address
                  </label>
                  <div className="flex items-center bg-[#150709] border border-red-950 rounded-xl px-3 py-2 text-xs focus-within:border-red-500 transition-colors">
                    <Mail className="w-4 h-4 text-red-400 mr-2 shrink-0" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full bg-transparent text-red-100 focus:outline-none placeholder:text-red-300/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-red-300 mb-1">
                    Password
                  </label>
                  <div className="flex items-center bg-[#150709] border border-red-950 rounded-xl px-3 py-2 text-xs focus-within:border-red-500 transition-colors">
                    <Lock className="w-4 h-4 text-red-400 mr-2 shrink-0" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-red-100 focus:outline-none placeholder:text-red-300/30"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !isSupabaseConfigured}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting 
                    ? 'Processing...' 
                    : authMode === 'signup' ? 'Create Free Account' : 'Sign In with Password'}
                </button>
              </form>

              {/* Status Message feedback */}
              <AnimatePresence>
                {statusMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 ${
                      statusMessage.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/15 border-red-500/40 text-red-200'
                    }`}
                  >
                    {statusMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    )}
                    <span>{statusMessage.text}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Divider for GitHub at the bottom */}
              <div className="relative flex items-center justify-center pt-1">
                <div className="w-full border-t border-red-950" />
                <span className="absolute bg-[#0d0406] px-2 text-[10px] font-mono uppercase tracking-wider text-red-400/70">
                  Or Continue With
                </span>
              </div>

              {/* GitHub Option at the Bottom */}
              <div>
                <button
                  type="button"
                  onClick={() => handleOAuth('github')}
                  disabled={!isSupabaseConfigured}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-900/60 hover:border-red-500/50 text-red-100 text-xs font-mono transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Github className="w-4 h-4 text-red-400" />
                  <span className="font-semibold">Sign in with GitHub</span>
                </button>
                <p className="text-[10px] text-red-400/60 font-mono text-center mt-1.5">
                  Opens GitHub authorization portal in a separate tab
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info link */}
        <div className="px-6 py-3.5 bg-[#080203] border-t border-red-950/80 flex items-center justify-between text-[10px] font-mono text-red-400/60">
          <span>PostgreSQL Auth + RLS</span>
          <a
            href="https://supabase.com/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-red-200 transition-colors"
          >
            <span>Supabase Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </motion.div>
    </div>
  );
};

