import React from 'react';
import {
  Home,
  Compass,
  Search,
  Library,
  Upload,
  Music2,
  Shield,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { user, isCreator, isAdmin, openAuthModal } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Library', icon: Library }
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-white/10 bg-[#080c16] text-white p-4 h-[calc(100vh-4rem)] sticky top-16 select-none">
      {/* Primary Navigation */}
      <div className="space-y-1 mb-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                active
                  ? 'bg-amber-500/15 text-amber-300 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-amber-400' : 'text-zinc-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Creator & Studio Section */}
      <div className="border-t border-white/10 pt-4 mb-4">
        <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">
          Creator & Admin
        </div>
        <button
          onClick={() => {
            if (!user) {
              openAuthModal('Sign in with your email to upload and share songs on Resonance.');
            } else {
              onNavigate('upload');
            }
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
            currentView === 'upload'
              ? 'bg-amber-500/15 text-amber-300 font-semibold'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Upload className="h-4 w-4 text-amber-400" />
          <span>Upload Music</span>
        </button>

        <button
          onClick={() => {
            if (!user || !isCreator) {
              openAuthModal('Sign in as a Creator to access the Artist Studio.', 'creator');
            } else {
              onNavigate('creator-dashboard');
            }
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition cursor-pointer mt-1 ${
            currentView === 'creator-dashboard'
              ? 'bg-amber-500/15 text-amber-300 font-semibold'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Music2 className="h-4 w-4 text-orange-400" />
          <span>Creator Studio</span>
        </button>

        <button
          onClick={() => {
            if (!user || !isAdmin) {
              openAuthModal('Sign in with an Administrator account to access the Trust & Safety Console.', 'admin');
            } else {
              onNavigate('admin');
            }
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition cursor-pointer mt-1 ${
            currentView === 'admin'
              ? 'bg-indigo-500/15 text-indigo-300 font-semibold'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="h-4 w-4 text-indigo-400" />
          <span>Admin Portal</span>
        </button>
      </div>

      {/* Playlists Quick Access */}
      <div className="flex-1 overflow-y-auto border-t border-white/10 pt-4 pr-1">
        <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
          <span>Featured Playlists</span>
        </div>
        <div className="space-y-1">
          <button
            onClick={() => onNavigate('playlist', { playlistId: 'pl_late_night_drive' })}
            className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition truncate"
          >
            Late Night Cyber Drive
          </button>
          <button
            onClick={() => onNavigate('playlist', { playlistId: 'pl_deep_focus' })}
            className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition truncate"
          >
            Deep Focus & Chill Beats
          </button>
          <button
            onClick={() => onNavigate('playlist', { playlistId: 'pl_golden_indie' })}
            className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition truncate"
          >
            Indie Sunsets & Golden Waves
          </button>
        </div>
      </div>

      {/* Open Discovery Banner for Anonymous */}
      {!user && (
        <div className="mt-auto p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Open Streaming</span>
          </div>
          <p className="text-zinc-400 text-[11px] leading-relaxed mb-2.5">
            Listen, search, and discover freely without creating an account.
          </p>
          <button
            onClick={() => openAuthModal('Join as an artist or sync your library.')}
            className="w-full rounded-lg bg-amber-500/20 border border-amber-500/30 py-1.5 text-center text-[11px] font-semibold text-amber-300 hover:bg-amber-500/30 transition cursor-pointer"
          >
            Join as Creator
          </button>
        </div>
      )}
    </aside>
  );
};
