import React, { useState } from 'react';
import { X, Key, Database, Sparkles, CheckCircle2, AlertCircle, Cpu } from 'lucide-react';
import { saveSupabaseCredentials, isSupabaseConfigured } from '../lib/supabase';
import { getAIConfig, saveAIConfig, AIProvider } from '../lib/ai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const currentConfig = getAIConfig();

  const [supabaseUrl, setSupabaseUrl] = useState(
    import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('SN_SUPABASE_URL') || ''
  );
  const [supabaseKey, setSupabaseKey] = useState(
    import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('SN_SUPABASE_ANON_KEY') || ''
  );

  // Multi-Provider AI State
  const [provider, setProvider] = useState<AIProvider>(currentConfig.provider);
  const [aiKey, setAiKey] = useState<string>(currentConfig.apiKey);
  const [model, setModel] = useState<string>(currentConfig.model);
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(currentConfig.customBaseUrl || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    if (newProvider === 'gemini') {
      setModel('gemini-2.5-flash');
    } else if (newProvider === 'groq') {
      setModel('llama-3.3-70b-versatile');
    } else if (newProvider === 'openai') {
      setModel('gpt-4o-mini');
    } else {
      setModel('meta-llama/llama-3.3-70b-instruct');
      if (!customBaseUrl) setCustomBaseUrl('https://openrouter.ai/api/v1');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseUrl && supabaseKey) {
      saveSupabaseCredentials(supabaseUrl, supabaseKey);
    }
    saveAIConfig({
      provider,
      apiKey: aiKey,
      model,
      customBaseUrl
    });
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="glass-panel rounded-2xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-sky-400/30 overflow-hidden relative shard-accent max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-sky-300/60 hover:text-white p-1 rounded-xl hover:bg-sky-900/40 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-cyan-400 mb-2">
          <Cpu className="w-5 h-5 text-cyan-300" />
          <h2 className="text-xl font-black bg-gradient-to-r from-white via-sky-200 to-cyan-400 bg-clip-text text-transparent">
            Cloud & AI Provider Settings
          </h2>
        </div>

        <p className="text-xs text-sky-200/60 mb-5">
          Select any AI provider (Google Gemini, Groq, OpenAI, or Custom) and enter your key. All keys stay private on your device.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          {/* AI Provider Section */}
          <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-400/20 space-y-3">
            <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Select Your AI Provider
            </label>

            {/* Provider Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['gemini', 'groq', 'openai', 'custom'] as AIProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleProviderChange(p)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold capitalize transition-all border ${
                    provider === p
                      ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-sm shadow-cyan-500/20'
                      : 'bg-sky-950/40 text-sky-300/70 border-sky-400/10 hover:text-white'
                  }`}
                >
                  {p === 'gemini' ? 'Gemini' : p === 'groq' ? 'Groq (Free)' : p === 'openai' ? 'OpenAI' : 'Custom'}
                </button>
              ))}
            </div>

            {/* API Key */}
            <div>
              <label className="block text-[11px] font-semibold text-sky-200 mb-1">
                {provider.toUpperCase()} API Key *
              </label>
              <input
                type="password"
                placeholder={
                  provider === 'gemini' ? 'AIzaSy...' :
                  provider === 'groq' ? 'gsk_...' :
                  provider === 'openai' ? 'sk-...' : 'API Key...'
                }
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-sky-950/80 border border-sky-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono"
              />
              <p className="text-[10px] text-sky-300/50 mt-1">
                {provider === 'groq' && 'Get free key instantly at console.groq.com (Ultra-fast & zero 503 errors).'}
                {provider === 'gemini' && 'Get free key at aistudio.google.com.'}
                {provider === 'openai' && 'Get key at platform.openai.com.'}
                {provider === 'custom' && 'Works with OpenRouter, DeepSeek, Local Ollama, etc.'}
              </p>
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-[11px] font-semibold text-sky-200 mb-1">
                Model Name
              </label>
              <input
                type="text"
                placeholder="e.g. gemini-2.5-flash, llama-3.3-70b-versatile"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-sky-950/80 border border-sky-400/30 rounded-lg text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono"
              />
            </div>

            {/* Custom Base URL (if custom) */}
            {provider === 'custom' && (
              <div>
                <label className="block text-[11px] font-semibold text-sky-200 mb-1">
                  Custom Base URL
                </label>
                <input
                  type="text"
                  placeholder="https://openrouter.ai/api/v1"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-sky-950/80 border border-sky-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono"
                />
              </div>
            )}
          </div>

          {/* Supabase Storage & Database Section */}
          <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-400/20 space-y-3">
            <label className="block text-xs font-bold text-sky-200 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" /> Supabase Cloud Storage
              </span>
              {isSupabaseConfigured ? (
                <span className="text-emerald-400 flex items-center gap-1 text-[10px] normal-case font-bold">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1 text-[10px] normal-case font-bold">
                  <AlertCircle className="w-3 h-3" /> Missing
                </span>
              )}
            </label>

            <div>
              <label className="block text-[11px] font-semibold text-sky-200 mb-1">Project URL</label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-sky-950/80 border border-sky-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-sky-200 mb-1">Anon Public Key</label>
              <input
                type="password"
                placeholder="eyJhbGciOi..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-sky-950/80 border border-sky-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono"
              />
            </div>
          </div>

          {savedSuccess && (
            <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Settings saved! Reloading...</span>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-sky-300 hover:text-white rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-lg shadow-md shadow-cyan-500/30 border border-cyan-300/30"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
