import React, { useState, useEffect } from 'react';
import { X, Sparkles, LogOut, ShieldCheck, Key, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getCreditTracker, getAIConfig, saveAIConfig, AIProvider } from '../lib/ai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSignOut: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSignOut,
}) => {
  const [credits, setCredits] = useState(getCreditTracker());
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  // Admin AI Config fields
  const currentConfig = getAIConfig();
  const [provider, setProvider] = useState<AIProvider>(currentConfig.provider);
  const [aiKey, setAiKey] = useState<string>(currentConfig.apiKey);
  const [model, setModel] = useState<string>(currentConfig.model);
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(currentConfig.customBaseUrl || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const updateCredits = () => {
      setCredits(getCreditTracker());
    };
    window.addEventListener('sn_credits_updated', updateCredits);
    return () => window.removeEventListener('sn_credits_updated', updateCredits);
  }, []);

  if (!isOpen) return null;

  const percentLeft = Math.round((credits.remaining / credits.total) * 100);
  const isLow = credits.remaining < 150;

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    // Default admin passcode or creator match
    if (adminPasswordInput === 'admin123' || adminPasswordInput === 'moveon' || user?.email?.includes('move')) {
      setIsAdminMode(true);
      setShowAdminLogin(false);
      setAdminAuthError(null);
    } else {
      setAdminAuthError('Incorrect Admin Passcode. Only the project owner can change keys.');
    }
  };

  const handleSaveAdminConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveAIConfig({
      provider,
      apiKey: aiKey.trim(),
      model: model.trim(),
      customBaseUrl: customBaseUrl.trim()
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsAdminMode(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden text-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-none">
              Account & System
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              {user?.email ? user.email : 'Guest Student'}
            </p>
          </div>
        </div>

        {/* 1. VISIBLE CREDIT METER (Students can check & notify creator) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-5">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-700 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLow ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              AI Credits Available
            </span>
            <span className={`font-mono ${isLow ? 'text-amber-600' : 'text-blue-600'}`}>
              {credits.remaining} / {credits.total}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isLow ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'
              }`}
              style={{ width: `${percentLeft}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            {isLow ? (
              <span className="text-amber-600 font-semibold">
                ⚠️ Credits are running low! Please notify the admin to refresh the AI key.
              </span>
            ) : (
              <span>All AI features (Auto-Naming & MOVE ON bot) are active and running for free.</span>
            )}
          </p>
        </div>

        {/* 2. ADMIN KEY SWAPPER (Visible only when unlocked by creator) */}
        {isAdminMode ? (
          <form onSubmit={handleSaveAdminConfig} className="space-y-3 p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Creator Admin Mode
              </span>
              <button
                type="button"
                onClick={() => setIsAdminMode(false)}
                className="text-[10px] text-blue-600 underline font-semibold"
              >
                Exit Admin
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                Switch AI Provider
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['gemini', 'groq', 'openai'] as AIProvider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setProvider(p);
                      if (p === 'gemini') setModel('gemini-3.1-flash-lite');
                      if (p === 'groq') setModel('llama-3.3-70b-versatile');
                      if (p === 'openai') setModel('gpt-4o-mini');
                    }}
                    className={`py-1 text-xs font-bold rounded-lg capitalize border ${
                      provider === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                Active API Key
              </label>
              <input
                type="password"
                placeholder="Enter new API key..."
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {saveSuccess && (
              <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Key updated successfully!
              </div>
            )}

            <button
              type="submit"
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              Save New API Key
            </button>
          </form>
        ) : showAdminLogin ? (
          <form onSubmit={handleAdminAuth} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-4 space-y-2">
            <label className="block text-xs font-bold text-slate-700">Enter Admin Passcode</label>
            <input
              type="password"
              placeholder="Passcode..."
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {adminAuthError && (
              <p className="text-[10px] text-red-500 font-semibold">{adminAuthError}</p>
            )}
            <div className="flex space-x-1.5">
              <button
                type="submit"
                className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg"
              >
                Unlock
              </button>
              <button
                type="button"
                onClick={() => setShowAdminLogin(false)}
                className="px-2.5 py-1.5 text-xs text-slate-600 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => setShowAdminLogin(true)}
              className="text-[11px] text-slate-400 hover:text-blue-600 font-medium flex items-center gap-1"
            >
              <Key className="w-3 h-3" /> Admin Key Reload
            </button>
          </div>
        )}

        {/* 3. LOG OUT BUTTON */}
        <button
          onClick={() => {
            onSignOut();
            onClose();
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center space-x-2 border border-red-200/80 transition-all active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Notes Shelf</span>
        </button>
      </div>
    </div>
  );
};
