import React, { useState } from 'react';
import { X, Key, Database, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { saveSupabaseCredentials, isSupabaseConfigured } from '../lib/supabase';
import { saveGeminiApiKey, isGeminiConfigured } from '../lib/gemini';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [supabaseUrl, setSupabaseUrl] = useState(
    import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('SN_SUPABASE_URL') || ''
  );
  const [supabaseKey, setSupabaseKey] = useState(
    import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('SN_SUPABASE_ANON_KEY') || ''
  );
  const [geminiKey, setGeminiKey] = useState(
    import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('SN_GEMINI_KEY') || ''
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseUrl && supabaseKey) {
      saveSupabaseCredentials(supabaseUrl, supabaseKey);
    }
    if (geminiKey) {
      saveGeminiApiKey(geminiKey);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-sky-400/30 overflow-hidden relative shard-accent">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-sky-300/60 hover:text-white p-1 rounded-xl hover:bg-sky-900/40 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-cyan-400 mb-3">
          <Key className="w-5 h-5 text-cyan-300" />
          <h2 className="text-xl font-black bg-gradient-to-r from-white via-sky-200 to-cyan-400 bg-clip-text text-transparent">
            Cloud & AI Settings
          </h2>
        </div>

        <p className="text-xs text-sky-200/60 mb-6">
          Connect your free Supabase cloud database and your Google AI Studio Gemini API key. All keys stay private in your browser.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Supabase URL */}
          <div>
            <label className="block text-xs font-bold text-sky-200 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Supabase Project URL</span>
              {isSupabaseConfigured ? (
                <span className="text-emerald-400 flex items-center gap-1 text-[11px] normal-case font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1 text-[11px] normal-case font-bold">
                  <AlertCircle className="w-3.5 h-3.5" /> Needed for Cloud Sync
                </span>
              )}
            </label>
            <div className="relative">
              <Database className="w-4 h-4 text-cyan-400/60 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-sky-950/60 border border-sky-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono transition-all"
              />
            </div>
          </div>

          {/* Supabase Anon Key */}
          <div>
            <label className="block text-xs font-bold text-sky-200 uppercase tracking-wider mb-1">
              Supabase Anon Public Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-sky-950/60 border border-sky-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono transition-all"
            />
          </div>

          {/* Gemini API Key */}
          <div className="pt-2 border-t border-sky-400/20">
            <label className="block text-xs font-bold text-sky-200 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Google Gemini API Key</span>
              {isGeminiConfigured() ? (
                <span className="text-emerald-400 flex items-center gap-1 text-[11px] normal-case font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> AI Ready (Gemini 3.8/3.5)
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1 text-[11px] normal-case font-bold">
                  <Sparkles className="w-3.5 h-3.5" /> Needed for Auto-Sort & Rename
                </span>
              )}
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-sky-950/60 border border-sky-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono transition-all"
            />
            <p className="text-[11px] text-sky-300/60 mt-1">
              Obtained free from <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Google AI Studio</a>.
            </p>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Settings saved! Reloading application...</span>
            </div>
          )}

          <div className="pt-3 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-sky-300 hover:text-white rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 border border-cyan-300/30"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
