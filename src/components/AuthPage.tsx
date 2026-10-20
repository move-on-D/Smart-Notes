import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, Phone, ArrowRight, Sparkles, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, isSupabaseConfigured } from '../lib/supabase';

interface AuthPageProps {
  onSuccess: () => void;
  onContinueAsGuest: () => void;
  onOpenSettings: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccess,
  onContinueAsGuest,
  onOpenSettings,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Please configure your Supabase Project URL & Key first in Settings (gear icon).');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        if (!fullName.trim()) throw new Error('Please enter your full name.');
        await signUpWithEmail(email.trim(), password, {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
        });
        setSuccessMsg('Account created! Please check your email to confirm, or you can sign in directly.');
        setTimeout(() => onSuccess(), 1000);
      } else {
        await signInWithEmail(email.trim(), password);
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!isSupabaseConfigured) {
      setError('Please configure your Supabase Project URL & Key first.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Google Sign-In failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10 animate-fade-in">
      {/* Background Micro Shards */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 left-10 w-24 h-32 bg-sky-400/5 border border-sky-300/15 backdrop-blur-[1px] glass-shard-1 rotate-12 opacity-40"></div>
        <div className="absolute bottom-1/4 right-10 w-28 h-36 bg-cyan-400/5 border border-cyan-300/15 backdrop-blur-[1px] glass-shard-2 -rotate-25 opacity-35"></div>
      </div>

      <div className="glass-panel rounded-3xl max-w-md w-full p-6 sm:p-8 border border-sky-400/25 shadow-2xl relative overflow-hidden shard-accent z-10">
        {/* Top Header Badge */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-blue-700 flex items-center justify-center text-white mx-auto mb-3 border border-cyan-300/40 glass-shard-1 shadow-lg shadow-cyan-500/25">
            <Lock className="w-6 h-6 text-cyan-100" />
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-white via-sky-200 to-cyan-400 bg-clip-text text-transparent">
            {isSignUp ? 'Create Your Account' : 'Welcome to SyllabusShelf'}
          </h1>
          <p className="text-xs text-sky-200/60 mt-1">
            {isSignUp
              ? 'One account to access your college notes anywhere, anytime'
              : 'Sign in to access your cloud-synced digital shelves'}
          </p>
        </div>

        {/* Tab Toggle: Sign In / Create Account */}
        <div className="flex rounded-xl bg-sky-950/60 p-1 border border-sky-400/20 mb-5">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isSignUp
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-sky-300/60 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isSignUp
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-sky-300/60 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error or Success notification */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-sky-200 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-cyan-400/60 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dinesh Chand"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-sky-950/70 border border-sky-400/30 rounded-xl text-white placeholder-sky-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-sky-200 uppercase tracking-wider mb-1">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-cyan-400/60 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-sky-950/70 border border-sky-400/30 rounded-xl text-white placeholder-sky-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-medium"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-sky-200 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-cyan-400/60 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="student@college.edu or gmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-sky-950/70 border border-sky-400/30 rounded-xl text-white placeholder-sky-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-sky-200 uppercase tracking-wider mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-cyan-400/60 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-sky-950/70 border border-sky-400/30 rounded-xl text-white placeholder-sky-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 border border-cyan-300/30 transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Authenticating...' : isSignUp ? 'Create My Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-sky-400/20"></div>
          <span className="px-3 text-[10px] uppercase font-bold text-sky-300/40">or continue with</span>
          <div className="flex-1 border-t border-sky-400/20"></div>
        </div>

        {/* Google OAuth & Drive sync button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-white text-slate-800 hover:bg-slate-100 transition-all flex items-center justify-center space-x-2 shadow-md shadow-white/5 active:scale-95"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google / Gmail</span>
        </button>

        {/* Footer controls: Guest demo mode & Settings */}
        <div className="mt-5 pt-3.5 border-t border-sky-400/15 flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="text-cyan-300 hover:text-white font-semibold transition-colors"
          >
            Skip for now (Guest Mode) →
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="text-sky-300/60 hover:text-sky-200 transition-colors"
          >
            Cloud Config
          </button>
        </div>
      </div>
    </div>
  );
};
