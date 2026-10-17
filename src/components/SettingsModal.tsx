import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import { getAIConfig, saveAIConfig, AIProvider } from '../lib/ai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const currentConfig = getAIConfig();

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
    saveAIConfig({
      provider,
      apiKey: aiKey.trim(),
      model: model.trim(),
      customBaseUrl: customBaseUrl.trim()
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Clean Header */}
        <div className="flex items-center space-x-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              AI Settings
            </h2>
            <p className="text-xs text-slate-500">
              Choose your AI provider and enter your API key to auto-sort notes.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {/* AI Provider Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select AI Service
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['gemini', 'groq', 'openai', 'custom'] as AIProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleProviderChange(p)}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg capitalize transition-all border ${
                    provider === p
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p === 'gemini' ? 'Gemini' : p === 'groq' ? 'Groq' : p === 'openai' ? 'OpenAI' : 'Other'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {provider === 'groq' && '💡 Recommended: Groq gives free, ultra-fast Llama 3 keys at console.groq.com'}
              {provider === 'gemini' && '💡 Free keys available at aistudio.google.com'}
              {provider === 'openai' && '💡 OpenAI keys from platform.openai.com'}
              {provider === 'custom' && '💡 Compatible with OpenRouter, DeepSeek, or any OpenAI-compatible URL'}
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              API Key *
            </label>
            <input
              type="password"
              placeholder={
                provider === 'gemini' ? 'AIzaSy...' :
                provider === 'groq' ? 'gsk_...' :
                provider === 'openai' ? 'sk-...' : 'Enter your API key...'
              }
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
            />
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Model Name
            </label>
            <input
              type="text"
              placeholder="e.g. gemini-2.5-flash, llama-3.3-70b-versatile"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
            />
          </div>

          {/* Custom Base URL (if custom) */}
          {provider === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                API Base URL
              </label>
              <input
                type="text"
                placeholder="https://openrouter.ai/api/v1"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
              />
            </div>
          )}

          {savedSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">AI Settings saved successfully!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-all"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
