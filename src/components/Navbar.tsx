import React, { useState } from 'react';
import {
  Radio,
  Search,
  Upload,
  User,
  Shield,
  Music2,
  LogIn,
  LogOut,
  ChevronDown,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  searchQuery,
  onSearchChange
}) => {
  const { user, logout, openAuthModal, isAdmin, isCreator } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#0b0f1a]/85 backdrop-blur-md px-4 md:px-8">
      {/* Brand logo */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 text-black shadow-lg shadow-amber-500/25 group-hover:scale-105 transition">
            <Radio className="h-5 w-5" />
          </div>
          <div className="text-left">
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-amber-300 transition font-sans">
              Resonance
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Open Stream
            </span>
          </div>
        </button>

        {/* Desktop Quick Nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-zinc-400">
          <button
            onClick={() => onNavigate('home')}
            className={`px-3 py-1.5 rounded-lg transition ${
              currentView === 'home' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('discover')}
            className={`px-3 py-1.5 rounded-lg transition ${
              currentView === 'discover' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => onNavigate('library')}
            className={`px-3 py-1.5 rounded-lg transition ${
              currentView === 'library' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'
            }`}
          >
            Library
          </button>
        </nav>
      </div>

      {/* Middle: Search input bar */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tracks, artists, albums, genres..."
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (currentView !== 'search') {
                onNavigate('search');
              }
            }}
            onFocus={() => {
              if (currentView !== 'search') {
                onNavigate('search');
              }
            }}
            className="w-full rounded-full border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-xs md:text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:bg-white/10 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Right side: Upload, Admin Access, and User auth */}
      <div className="flex items-center gap-3">
        {/* Upload Button */}
        <button
          id="nav-upload-btn"
          onClick={() => {
            if (!user) {
              openAuthModal('Sign in with your email and password to upload and publish songs on Resonance.');
            } else {
              onNavigate('upload');
            }
          }}
          className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        {/* User Auth or Sign In */}
        {!user ? (
          <div className="flex items-center gap-2">
            <button
              id="nav-admin-login-btn"
              onClick={() => openAuthModal('Admin security login via email OTP', 'admin')}
              className="flex items-center gap-1 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
              title="Admin OTP Portal (ventux0x@gmail.com)"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Admin OTP</span>
            </button>

            <button
              id="nav-signin-btn"
              onClick={() => openAuthModal('Sign in with your email and password')}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 transition cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 rounded-full p-1 border border-white/10 hover:border-white/30 transition cursor-pointer"
            >
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                alt={user.username}
                className="h-7 w-7 rounded-full object-cover"
              />
              <span className="hidden sm:inline text-xs font-medium text-white max-w-[100px] truncate">
                {user.username}
              </span>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>

            {profileDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/10 bg-[#121829] p-2 shadow-2xl text-xs z-50"
                onClick={() => setProfileDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-white/10 mb-1">
                  <p className="font-semibold text-white truncate">{user.username}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">
                    {user.role}
                  </span>
                </div>

                {isCreator && (
                  <button
                    onClick={() => onNavigate('creator-dashboard')}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white transition text-left"
                  >
                    <Music2 className="h-4 w-4 text-amber-400" />
                    Creator Studio
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => onNavigate('admin')}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white transition text-left"
                  >
                    <Shield className="h-4 w-4 text-indigo-400" />
                    Admin Moderation
                  </button>
                )}

                <button
                  onClick={() => onNavigate('library')}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white transition text-left"
                >
                  <Layers className="h-4 w-4 text-zinc-400" />
                  Your Library
                </button>

                <div className="my-1 border-t border-white/10" />

                <button
                  onClick={() => openAuthModal('Switch to another profile or portal.', 'user')}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white transition text-left"
                >
                  <User className="h-4 w-4 text-cyan-400" />
                  Switch Account
                </button>

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-red-400 hover:bg-red-500/10 transition text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
