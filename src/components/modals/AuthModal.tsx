import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Shield,
  Sparkles,
  User,
  LogIn,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Mail,
  Send,
  RefreshCw,
  Inbox,
  Clock,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface AuthModalProps {
  onNavigate?: (view: string, params?: any) => void;
}

const ADMIN_EMAIL = 'ventux0x@gmail.com';

export const AuthModal: React.FC<AuthModalProps> = ({ onNavigate }) => {
  const {
    authModalOpen,
    authModalReason,
    authModalTab,
    setAuthModalTab,
    closeAuthModal,
    login,
    loginAdminWithOtp,
    sendAdminOtp,
    sendVerificationCode,
    register
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'user' | 'admin' | 'register'>('user');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [registerRole, setRegisterRole] = useState<'user' | 'creator'>('creator');

  // OTP / Verification Code State
  const [otpCode, setOtpCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [dispatchedCodePreview, setDispatchedCodePreview] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Email Outbox Inspector for Preview
  const [showEmailOutbox, setShowEmailOutbox] = useState(false);
  const [outboxEmails, setOutboxEmails] = useState<any[]>([]);

  // Status
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Sync tab state when modal opens
  useEffect(() => {
    if (authModalOpen) {
      const initial = authModalTab === 'admin' ? 'admin' : authModalTab === 'register' ? 'register' : 'user';
      setActiveTab(initial);
      setError('');
      setSuccessMessage('');
      setCodeSent(false);
      setOtpCode('');
      setDispatchedCodePreview(null);

      if (initial === 'admin') {
        setEmail(ADMIN_EMAIL);
        setPassword('');
      } else {
        setEmail('');
        setPassword('');
        setUsername('');
      }
    }
  }, [authModalOpen, authModalTab]);

  // Countdown timer for OTP rate limit cooldown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!authModalOpen) return null;

  const handleTabChange = (tab: 'user' | 'admin' | 'register') => {
    setActiveTab(tab);
    setAuthModalTab(tab);
    setError('');
    setSuccessMessage('');
    setCodeSent(false);
    setOtpCode('');
    setDispatchedCodePreview(null);

    if (tab === 'admin') {
      setEmail(ADMIN_EMAIL);
      setPassword('');
    } else {
      setEmail('');
      setPassword('');
      setUsername('');
    }
  };

  const fetchOutbox = async () => {
    try {
      const targetEmail = activeTab === 'admin' ? ADMIN_EMAIL : email.trim() || undefined;
      const res = await api.getEmailOutbox(targetEmail);
      setOutboxEmails(res.outbox || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Dispatch Admin OTP with rate limit handling
  const handleSendAdminOtp = async () => {
    setError('');
    setSuccessMessage('');
    setIsSendingOtp(true);

    try {
      const res = await sendAdminOtp(ADMIN_EMAIL);
      setCodeSent(true);
      setDispatchedCodePreview(res.code);
      setCountdown(res.retryAfter || 60);
      setSuccessMessage(`One-Time Password (OTP) dispatched to ${ADMIN_EMAIL}. Valid for 10 minutes.`);
      fetchOutbox();
    } catch (err: any) {
      const errMsg = err.message || 'Failed to dispatch Admin OTP.';
      setError(errMsg);
      if (errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('wait')) {
        // Extract numeric cooldown if present
        const match = errMsg.match(/(\d+)\s*seconds/i);
        if (match) {
          setCountdown(parseInt(match[1], 10));
        }
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Dispatch Registration Verification Code
  const handleSendRegisterCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address to receive the verification code.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsSendingOtp(true);

    try {
      const res = await sendVerificationCode(email.trim(), 'register');
      setCodeSent(true);
      setDispatchedCodePreview(res.code);
      setCountdown(60);
      setSuccessMessage(`Registration verification code sent to ${email.trim()}.`);
      fetchOutbox();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification email.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      if (activeTab === 'admin') {
        // ADMIN LOGIN: Only ask OTP code from email - NO PASSWORD REQUIRED
        if (!otpCode.trim()) {
          throw new Error(`Please enter the 6-digit OTP code sent to ${ADMIN_EMAIL}.`);
        }

        await loginAdminWithOtp(ADMIN_EMAIL, otpCode.trim());
        setSuccessMessage('Admin OTP verified! Administrator access granted.');
        setTimeout(() => {
          closeAuthModal();
          if (onNavigate) onNavigate('admin');
        }, 500);
      } else if (activeTab === 'register') {
        // REGISTER: Require email, password, and verified email code
        if (!username.trim()) throw new Error('Username or artist name is required.');
        if (!email.trim()) throw new Error('Email address is required.');
        if (!password.trim() || password.length < 6) throw new Error('Password must be at least 6 characters.');

        if (!codeSent) {
          await handleSendRegisterCode();
          setIsSubmitting(false);
          return;
        }

        if (!otpCode.trim()) {
          throw new Error('Please enter the 6-digit verification code sent to your email.');
        }

        const result = await register({
          username: username.trim(),
          email: email.trim(),
          password,
          role: registerRole,
          code: otpCode.trim()
        });

        setSuccessMessage(`Account verified! Welcome to Resonance, ${result.user?.username || ''}.`);
        setTimeout(() => {
          closeAuthModal();
          if (onNavigate) {
            if (registerRole === 'creator') onNavigate('creator-dashboard');
            else onNavigate('library');
          }
        }, 600);
      } else {
        // STANDARD USER LOGIN: Require email and password (no 1-click login)
        if (!email.trim()) throw new Error('Please enter your email address.');
        if (!password.trim()) throw new Error('Please enter your password.');

        if (email.trim().toLowerCase() === ADMIN_EMAIL) {
          throw new Error('Administrator account requires OTP login only (no password required). Please switch to the Admin OTP portal.');
        }

        const result = await login(email.trim(), password);
        setSuccessMessage(`Welcome back, ${result.user?.username || 'User'}!`);
        setTimeout(() => {
          closeAuthModal();
          if (onNavigate) {
            if (result.user?.role === 'creator') onNavigate('creator-dashboard');
            else onNavigate('home');
          }
        }, 500);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="auth-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={closeAuthModal}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0f1422] text-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Banner */}
          <div
            className={`relative border-b border-white/10 p-5 transition-colors ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-indigo-950/80 via-indigo-900/40 to-black/80'
                : activeTab === 'register'
                ? 'bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-black/80'
                : 'bg-gradient-to-r from-amber-950/80 via-amber-900/40 to-black/80'
            }`}
          >
            <button
              onClick={closeAuthModal}
              className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  activeTab === 'admin'
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : activeTab === 'register'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {activeTab === 'admin' ? (
                  <Shield className="h-6 w-6" />
                ) : activeTab === 'register' ? (
                  <UserPlus className="h-6 w-6" />
                ) : (
                  <LogIn className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  {activeTab === 'admin' && 'Administrator Portal'}
                  {activeTab === 'user' && 'Resonance Sign In'}
                  {activeTab === 'register' && 'Create Verified Account'}
                  {activeTab === 'admin' && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                      OTP Only • No Password
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {activeTab === 'admin'
                    ? 'Secured with email OTP verification & rate limiting.'
                    : activeTab === 'register'
                    ? 'Register with email, password, and email verification code.'
                    : 'Sign in with your registered email and password.'}
                </p>
                {authModalReason && (
                  <p className="mt-2 text-[11px] text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                    {authModalReason}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="grid grid-cols-3 border-b border-white/10 bg-white/[0.02] text-xs font-semibold">
            <button
              onClick={() => handleTabChange('user')}
              className={`py-3 px-2 text-center transition cursor-pointer border-b-2 flex flex-col items-center gap-1 ${
                activeTab === 'user'
                  ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Email & Password</span>
            </button>
            <button
              onClick={() => handleTabChange('admin')}
              className={`py-3 px-2 text-center transition cursor-pointer border-b-2 flex flex-col items-center gap-1 ${
                activeTab === 'admin'
                  ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Admin OTP Portal</span>
            </button>
            <button
              onClick={() => handleTabChange('register')}
              className={`py-3 px-2 text-center transition cursor-pointer border-b-2 flex flex-col items-center gap-1 ${
                activeTab === 'register'
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Register</span>
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
            {/* Feedback Alerts */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* In-app Email OTP Delivery Notification & Live Preview */}
            {dispatchedCodePreview && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    Secure Email Dispatch
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Delivered</span>
                </div>
                <p className="text-xs text-zinc-300">
                  Code sent to <strong className="text-white">{activeTab === 'admin' ? ADMIN_EMAIL : email}</strong>:
                </p>
                <div className="flex items-center justify-between bg-black/40 px-3.5 py-2.5 rounded-lg border border-indigo-500/20">
                  <span className="font-mono text-xl font-extrabold tracking-widest text-indigo-200">
                    {dispatchedCodePreview}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(dispatchedCodePreview)}
                    className="text-xs font-semibold text-indigo-300 hover:text-white underline cursor-pointer"
                  >
                    Auto-Fill Code
                  </button>
                </div>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ================= ADMIN TAB ================= */}
              {activeTab === 'admin' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5" />
                        Designated Administrator Account
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        Zero-Password Flow
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded-lg border border-white/10">
                      <span className="font-mono text-sm text-white font-medium">{ADMIN_EMAIL}</span>
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Authorized
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      No password required. Authentication is performed solely with a single-use 6-digit OTP sent to this inbox.
                    </p>
                  </div>

                  {/* Send OTP Trigger */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleSendAdminOtp}
                      disabled={isSendingOtp || countdown > 0}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
                    >
                      {isSendingOtp ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Dispatching Security OTP...</span>
                        </>
                      ) : countdown > 0 ? (
                        <>
                          <Clock className="h-3.5 w-3.5" />
                          <span>Rate Limit Cooldown: {countdown}s</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Send Admin OTP Code</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 6-Digit OTP Code Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Enter 6-Digit Admin OTP Code *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 741852"
                      className="w-full rounded-xl border border-indigo-400/40 bg-black/40 px-3.5 py-3 text-center text-xl font-mono tracking-widest text-indigo-200 placeholder-zinc-600 focus:border-indigo-400 focus:outline-none"
                    />
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                      <span>Rate limit: 60s cooldown, max 5 / 15m</span>
                      <span>Expires in 10 minutes</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= REGISTER TAB ================= */}
              {activeTab === 'register' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Username or Artist Name
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. Luna Horizon or SoundStudio"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none pr-28"
                      />
                      <button
                        type="button"
                        onClick={handleSendRegisterCode}
                        disabled={isSendingOtp || countdown > 0}
                        className="absolute right-1.5 top-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
                      >
                        <Send className="h-3 w-3" />
                        {isSendingOtp ? 'Sending...' : countdown > 0 ? `${countdown}s` : 'Send Code'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  {/* Verification Code */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      6-Digit Email Verification Code *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter code from inbox"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-center text-base font-mono tracking-widest text-emerald-200 placeholder-zinc-600 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  {/* Account Type */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                          registerRole === 'creator'
                            ? 'border-amber-400/60 bg-amber-500/10 text-white'
                            : 'border-white/10 bg-white/5 text-zinc-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reg-role"
                          checked={registerRole === 'creator'}
                          onChange={() => setRegisterRole('creator')}
                          className="hidden"
                        />
                        <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold">Creator / Artist</p>
                          <p className="text-[10px] text-zinc-400">Upload & stream original music</p>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                          registerRole === 'user'
                            ? 'border-cyan-400/60 bg-cyan-500/10 text-white'
                            : 'border-white/10 bg-white/5 text-zinc-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reg-role"
                          checked={registerRole === 'user'}
                          onChange={() => setRegisterRole('user')}
                          className="hidden"
                        />
                        <User className="h-4 w-4 text-cyan-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold">Listener</p>
                          <p className="text-[10px] text-zinc-400">Save library & playlists</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STANDARD USER LOGIN (EMAIL & PASSWORD) ================= */}
              {activeTab === 'user' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. listener@resonance.fm"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <p className="text-[11px] text-zinc-500">
                    Administrator? Use the <button type="button" onClick={() => handleTabChange('admin')} className="text-indigo-400 underline hover:text-indigo-300">Admin OTP Portal</button> (no password required).
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full rounded-xl py-3 text-xs font-bold tracking-wide transition cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
                  activeTab === 'admin'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                    : activeTab === 'register'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30'
                    : 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/30'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Authenticating...
                  </span>
                ) : activeTab === 'admin' ? (
                  'Verify Admin OTP & Log In'
                ) : activeTab === 'register' ? (
                  codeSent ? 'Verify Code & Complete Registration' : 'Send Code & Register'
                ) : (
                  'Sign In with Credentials'
                )}
              </button>
            </form>

            {/* Email Outbox Inspector for Preview/Testing */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailOutbox(!showEmailOutbox);
                    if (!showEmailOutbox) fetchOutbox();
                  }}
                  className="flex items-center gap-1.5 hover:text-white transition cursor-pointer"
                >
                  <Inbox className="h-3.5 w-3.5 text-indigo-400" />
                  <span>View Dispatched Email Outbox</span>
                </button>
                <span className="text-[10px] text-zinc-500">Preview Mode Delivery</span>
              </div>

              {showEmailOutbox && (
                <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 max-h-44 overflow-y-auto">
                  {outboxEmails.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-2">No verification emails recorded yet.</p>
                  ) : (
                    outboxEmails.map((eml, idx) => (
                      <div
                        key={`auth-outbox-${eml.id || idx}-${idx}`}
                        className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-[11px] space-y-1 font-mono"
                      >
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="font-semibold text-white truncate max-w-[200px]">To: {eml.to}</span>
                          <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                            <ShieldCheck className="h-3 w-3" /> Delivered
                          </span>
                        </div>
                        <p className="text-zinc-400 text-[10px]">{eml.subject}</p>
                        <div className="flex items-center justify-between pt-1 text-[10px] text-indigo-300">
                          <span>OTP: <strong className="text-white text-xs">{eml.code}</strong></span>
                          <button
                            type="button"
                            onClick={() => setOtpCode(eml.code)}
                            className="underline text-zinc-300 hover:text-white cursor-pointer"
                          >
                            Fill this OTP
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
