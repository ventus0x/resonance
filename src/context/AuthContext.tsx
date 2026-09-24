import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Artist, UserRole } from '../types';
import { api } from '../services/api';

export type AuthTab = 'user' | 'creator' | 'admin' | 'register';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  artist: Artist | null;
  isAuthenticated: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ user: User; token: string }>;
  loginWithCode: (email: string, code: string) => Promise<{ user: User; token: string }>;
  loginAdminWithOtp: (email: string, code: string) => Promise<{ user: User; token: string; message: string }>;
  sendVerificationCode: (email: string, purpose?: 'register' | 'login' | 'verify_email') => Promise<{ success: boolean; message: string; code: string; email: string; expiresAt: number }>;
  sendAdminOtp: (email: string) => Promise<{ success: boolean; message: string; code: string; email: string; expiresAt: number; retryAfter?: number }>;
  register: (data: { username: string; email: string; password: string; role?: 'user' | 'creator'; bio?: string; code?: string }) => Promise<{ user: User; token: string }>;
  logout: () => Promise<void>;
  // Auth Prompt Modal
  authModalOpen: boolean;
  authModalReason: string;
  authModalTab: AuthTab;
  setAuthModalTab: (tab: AuthTab) => void;
  openAuthModal: (reason?: string, initialTab?: AuthTab) => void;
  closeAuthModal: () => void;
  // Local anonymous likes
  localLikes: string[];
  likedTrackIds: string[];
  isLiked: (trackId: string) => boolean;
  toggleLike: (trackId: string) => Promise<void>;
  // Report Modal
  reportModal: { isOpen: boolean; trackId?: string; trackTitle?: string; artistName?: string };
  openReportModal: (trackId: string, trackTitle: string, artistName: string) => void;
  closeReportModal: () => void;
  // Add to Playlist Modal
  playlistModal: { isOpen: boolean; trackId?: string };
  openPlaylistModal: (trackId: string) => void;
  closePlaylistModal: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [role, setRole] = useState<UserRole>('anonymous');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Local likes for anonymous or offline state
  const [localLikes, setLocalLikes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('resonance_local_likes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Server likes for authenticated user
  const [serverLikes, setServerLikes] = useState<string[]>([]);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState('');
  const [authModalTab, setAuthModalTab] = useState<AuthTab>('user');
  const [reportModal, setReportModal] = useState<{ isOpen: boolean; trackId?: string; trackTitle?: string; artistName?: string }>({
    isOpen: false
  });
  const [playlistModal, setPlaylistModal] = useState<{ isOpen: boolean; trackId?: string }>({
    isOpen: false
  });

  // Save local likes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('resonance_local_likes', JSON.stringify(localLikes));
    } catch (e) {
      console.error(e);
    }
  }, [localLikes]);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('resonance_token');
    if (!token) {
      setUser(null);
      setArtist(null);
      setRole('anonymous');
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.getMe();
      if (res.user) {
        setUser(res.user);
        setArtist(res.artist || null);
        setRole(res.user.role);
        // Load server likes
        const likesRes = await api.getUserLikes();
        setServerLikes(likesRes.likes || []);
      } else {
        localStorage.removeItem('resonance_token');
        setUser(null);
        setArtist(null);
        setRole('anonymous');
      }
    } catch {
      setUser(null);
      setArtist(null);
      setRole('anonymous');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (res.token) {
      localStorage.setItem('resonance_token', res.token);
      await refreshUser();
      setAuthModalOpen(false);
    }
    return res;
  };

  const loginWithCode = async (email: string, code: string) => {
    const res = await api.loginWithCode(email, code);
    if (res.token) {
      localStorage.setItem('resonance_token', res.token);
      await refreshUser();
      setAuthModalOpen(false);
    }
    return res;
  };

  const sendVerificationCode = async (email: string, purpose: 'register' | 'login' | 'verify_email' = 'register') => {
    return await api.sendVerificationCode(email, purpose);
  };

  const sendAdminOtp = async (email: string) => {
    return await api.sendAdminOtp(email);
  };

  const loginAdminWithOtp = async (email: string, code: string) => {
    const res = await api.loginAdminWithOtp(email, code);
    if (res.token) {
      localStorage.setItem('resonance_token', res.token);
      await refreshUser();
      setAuthModalOpen(false);
    }
    return res;
  };

  const register = async (data: { username: string; email: string; password: string; role?: 'user' | 'creator'; bio?: string; code?: string }) => {
    const res = await api.register(data);
    if (res.token) {
      localStorage.setItem('resonance_token', res.token);
      await refreshUser();
      setAuthModalOpen(false);
    }
    return res;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('resonance_token');
    setUser(null);
    setArtist(null);
    setRole('anonymous');
    setServerLikes([]);
  };

  const openAuthModal = (reason?: string, initialTab: AuthTab = 'user') => {
    setAuthModalReason(reason || 'Create an account or sign in to continue.');
    setAuthModalTab(initialTab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAuthModalReason('');
  };

  const isLiked = (trackId: string): boolean => {
    if (user) {
      return serverLikes.includes(trackId);
    }
    return localLikes.includes(trackId);
  };

  const toggleLike = async (trackId: string) => {
    if (user) {
      try {
        const res = await api.toggleLike(trackId);
        if (res.liked) {
          setServerLikes((prev) => [...prev, trackId]);
        } else {
          setServerLikes((prev) => prev.filter((id) => id !== trackId));
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // Anonymous like stored locally in browser
      setLocalLikes((prev) => {
        if (prev.includes(trackId)) {
          return prev.filter((id) => id !== trackId);
        } else {
          return [...prev, trackId];
        }
      });
    }
  };

  const openReportModal = (trackId: string, trackTitle: string, artistName: string) => {
    setReportModal({ isOpen: true, trackId, trackTitle, artistName });
  };

  const closeReportModal = () => {
    setReportModal({ isOpen: false });
  };

  const openPlaylistModal = (trackId: string) => {
    if (!user) {
      openAuthModal('Sign in or register to create and customize your playlists.');
      return;
    }
    setPlaylistModal({ isOpen: true, trackId });
  };

  const closePlaylistModal = () => {
    setPlaylistModal({ isOpen: false });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        artist,
        isAuthenticated: !!user,
        isCreator: role === 'creator' || role === 'admin',
        isAdmin: role === 'admin',
        isLoading,
        login,
        loginWithCode,
        sendVerificationCode,
        register,
        logout,
        sendAdminOtp,
        loginAdminWithOtp,
        authModalOpen,
        authModalReason,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        closeAuthModal,
        localLikes,
        likedTrackIds: user ? serverLikes : localLikes,
        isLiked,
        toggleLike,
        reportModal,
        openReportModal,
        closeReportModal,
        playlistModal,
        openPlaylistModal,
        closePlaylistModal,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
