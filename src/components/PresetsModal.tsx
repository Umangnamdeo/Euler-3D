import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Cloud, 
  Clock, 
  Sparkles, 
  LogIn, 
  Check, 
  FolderOpen,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, usePresets } from '../hooks/useSupabase';
import { SavedSimulationPreset } from '../lib/supabase';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLab: string;
  currentParams: Record<string, any>;
  onLoadPreset: (preset: SavedSimulationPreset) => void;
  onOpenAuth: () => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  activeLab,
  currentParams,
  onLoadPreset,
  onOpenAuth,
}) => {
  const { user, isConfigured } = useAuth();
  const { presets, loading, error, savePreset, deletePreset } = usePresets(activeLab);

  const [presetTitle, setPresetTitle] = useState('');
  const [presetNotes, setPresetNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetTitle.trim()) return;

    setIsSaving(true);
    try {
      await savePreset(presetTitle.trim(), currentParams, activeLab, presetNotes.trim());
      setPresetTitle('');
      setPresetNotes('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      // handled by hook
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-[#0c1017] border border-[#1f2638] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1a1f2e] bg-[#07090e]/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-white tracking-wide uppercase">
                Supabase Presets Vault
              </h3>
              <p className="text-[11px] text-[#a0aec0] font-mono">
                Lab: <span className="text-white font-semibold uppercase">{activeLab}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#a0aec0] hover:text-white rounded-lg hover:bg-[#1a1f2e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {!user ? (
            <div className="p-5 bg-[#111622] rounded-xl border border-[#1a1f2e] text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <Database className="w-6 h-6" />
              </div>
              <h4 className="font-mono text-sm font-bold text-white">
                Sign in to sync presets
              </h4>
              <p className="text-xs text-[#a0aec0] max-w-xs mx-auto leading-relaxed">
                Connect your account via Supabase PostgreSQL to save your custom physics configurations and load them anywhere.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-[#05070a] font-mono text-xs font-bold hover:bg-neutral-200 transition-all shadow"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Open Auth Dialog</span>
              </button>
            </div>
          ) : (
            <>
              {/* Save Current State Form */}
              <form onSubmit={handleSave} className="p-4 bg-[#111622] rounded-xl border border-[#1a1f2e] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5 text-white" />
                    <span>Save Current Setup</span>
                  </span>
                  {saveSuccess && (
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 animate-pulse">
                      <Check className="w-3 h-3" /> Saved!
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Preset Name (e.g. Extreme Vortex Stall)"
                    value={presetTitle}
                    onChange={(e) => setPresetTitle(e.target.value)}
                    className="w-full bg-[#07090e] border border-[#1a1f2e] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-[#a0aec0]/40 focus:outline-none focus:border-white/50"
                  />
                  <input
                    type="text"
                    placeholder="Optional notes or observations..."
                    value={presetNotes}
                    onChange={(e) => setPresetNotes(e.target.value)}
                    className="w-full bg-[#07090e] border border-[#1a1f2e] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-[#a0aec0]/40 focus:outline-none focus:border-white/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving || !presetTitle.trim()}
                  className="w-full py-2 rounded-lg bg-white hover:bg-neutral-200 text-[#05070a] font-mono text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Uploading to Supabase...' : 'Save to Cloud Vault'}
                </button>
              </form>

              {/* Saved Presets List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-[#a0aec0] px-1">
                  <span>SAVED LAB PRESETS ({presets.length})</span>
                  {loading && <span className="text-white animate-spin">⟳</span>}
                </div>

                {presets.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-[#1a1f2e] rounded-xl text-xs text-[#a0aec0] font-mono">
                    No custom presets saved for this lab yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {presets.map((p) => (
                      <div
                        key={p.id}
                        className="p-3.5 bg-[#111622] rounded-xl border border-[#1a1f2e] hover:border-white/20 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-mono text-xs font-bold text-white truncate">
                              {p.title}
                            </h5>
                          </div>
                          {p.notes && (
                            <p className="text-[11px] text-[#a0aec0] truncate mt-0.5">
                              {p.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-[#a0aec0]/60 font-mono mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(p.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              onLoadPreset(p);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black font-mono text-[11px] font-semibold transition-colors flex items-center gap-1"
                            title="Load preset values into simulation"
                          >
                            <FolderOpen className="w-3 h-3" />
                            <span>Apply</span>
                          </button>
                          <button
                            onClick={() => deletePreset(p.id)}
                            className="p-1.5 rounded-lg text-[#a0aec0] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete preset from cloud"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
