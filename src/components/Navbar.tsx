import React from 'react';
import { PlusCircle, Settings, User as UserIcon, LogOut, LogIn } from 'lucide-react';
import { CupboardIcon } from './CupboardIcon';

interface NavbarProps {
  activeTab: 'shelf' | 'syllabus' | 'upload';
  setActiveTab: (tab: 'shelf' | 'syllabus' | 'upload') => void;
  onOpenSettings: () => void;
  isConfigured: boolean;
  user: any;
  onSignOut: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  isConfigured,
  user,
  onSignOut,
  onOpenAuth,
}) => {
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || null;

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-sky-400/20 shadow-lg shadow-sky-950/40 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo with Cupboard & Books */}
        <div 
          className="flex items-center space-x-3 cursor-pointer group" 
          onClick={() => setActiveTab('shelf')}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 border border-cyan-300/40 group-hover:scale-105 transition-transform glass-shard-1 p-1.5">
              <CupboardIcon className="w-full h-full text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-300 rounded-full blur-[1px] animate-pulse"></div>
          </div>

          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-1.5">
              <span className="bg-gradient-to-r from-white via-sky-200 to-cyan-400 bg-clip-text text-transparent">
                Notes Shelf
              </span>
              <span className="bg-sky-500/20 text-cyan-300 text-[9px] px-1.5 py-0.2 rounded-full font-bold border border-cyan-400/30">
                PRO
              </span>
            </span>
            <p className="text-[10px] text-sky-300/60 hidden sm:block font-medium">Smart College Notes Ingestion</p>
          </div>
        </div>

        {/* Navigation Glass Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveTab('shelf')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'shelf'
                ? 'bg-sky-500/25 text-cyan-200 border border-cyan-400/40 shadow-sm shadow-cyan-500/20'
                : 'text-sky-200/70 hover:text-white hover:bg-sky-900/30'
            }`}
          >
            Shelves
          </button>
          
          <button
            onClick={() => setActiveTab('syllabus')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'syllabus'
                ? 'bg-sky-500/25 text-cyan-200 border border-cyan-400/40 shadow-sm shadow-cyan-500/20'
                : 'text-sky-200/70 hover:text-white hover:bg-sky-900/30'
            }`}
          >
            Syllabus
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-cyan-500/25 active:scale-95 border border-cyan-300/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add to Shelf</span>
          </button>

          {/* User Account / Profile Badge when signed in */}
          {user && (
            <div className="flex items-center space-x-1.5 pl-1">
              <div 
                className="flex items-center space-x-1.5 bg-sky-950/60 border border-sky-400/30 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-cyan-200"
                title={`Signed in as ${user.email}`}
              >
                <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold">
                  {userName ? userName[0].toUpperCase() : 'U'}
                </div>
                <span className="hidden md:inline max-w-[100px] truncate">{userName}</span>
              </div>
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="p-1.5 rounded-xl text-sky-400/60 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-500/30 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* If Guest Mode, show Sign In button */}
          {!user && (
            <button
              onClick={onOpenAuth}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 hover:text-white hover:bg-sky-900/40 border border-sky-400/20 flex items-center space-x-1 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-sky-300/70 hover:text-white hover:bg-sky-900/40 transition-colors border border-sky-400/20 relative"
            title="App Settings"
          >
            <Settings className="w-4 h-4" />
            {!isConfigured && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
