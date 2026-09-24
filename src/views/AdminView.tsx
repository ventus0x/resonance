import React, { useEffect, useState } from 'react';
import {
  Shield,
  AlertTriangle,
  Users,
  Music,
  CheckCircle2,
  Eye,
  Trash2,
  Lock,
  Activity,
  TrendingUp,
  TrendingDown,
  FileText,
  UserCheck,
  UserX,
  PieChart,
  BarChart3,
  Calendar,
  Sparkles,
  Mail
} from 'lucide-react';
import type { ContentReport, User, AdminStats, EmailOutboxItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';

interface AdminViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onNavigate }) => {
  const { user, isAdmin, openAuthModal } = useAuth();

  const [activeTab, setActiveTab] = useState<'analytics' | 'reports' | 'users' | 'audit' | 'emails'>('analytics');
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [emailOutbox, setEmailOutbox] = useState<EmailOutboxItem[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      if (!user || !isAdmin) return;
      setLoading(true);
      try {
        const [statsData, repRes, usersRes, logsRes, emailRes] = await Promise.all([
          api.getAdminStats().catch((e) => {
            console.error('Failed to load admin stats', e);
            return null;
          }),
          api.getReports().catch(() => ({ reports: [] })),
          api.getAdminUsers().catch(() => ({ users: [] })),
          api.getAuditLogs().catch(() => ({ logs: [] })),
          api.getEmailOutbox().catch(() => ({ outbox: [] }))
        ]);

        if (statsData) setStats(statsData);
        setReports(repRes.reports || []);
        setUsersList(usersRes.users || []);
        setAuditLogs(logsRes.logs || []);
        setEmailOutbox(emailRes.outbox || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, [user, isAdmin]);

  // Security gate
  if (!user || !isAdmin) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-white">Administrator Access Required</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          This portal contains platform moderation tools, user management, and global streaming telemetry. Please authenticate with an administrator account to continue.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => openAuthModal('Sign in with Administrator account to access the Admin Console.', 'admin')}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-xs font-bold text-white transition cursor-pointer"
          >
            Admin Sign In
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="rounded-xl bg-white/10 hover:bg-white/15 px-5 py-2.5 text-xs font-semibold text-white transition cursor-pointer"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const handleResolveReport = async (reportId: string, action: 'dismiss' | 'takedown') => {
    setProcessingId(reportId);
    try {
      if (action === 'dismiss') {
        await api.resolveReport(reportId, 'dismissed');
      } else {
        await api.resolveReport(reportId, 'resolved', true, 'Removed by platform administrator for violation.');
      }
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (stats) {
        setStats({
          ...stats,
          pendingReports: Math.max(0, stats.pendingReports - 1),
          resolvedReports: action === 'takedown' ? stats.resolvedReports + 1 : stats.resolvedReports,
          dismissedReports: action === 'dismiss' ? stats.dismissedReports + 1 : stats.dismissedReports
        });
      }
      // Refresh audit logs
      const freshLogs = await api.getAuditLogs().catch(() => null);
      if (freshLogs?.logs) setAuditLogs(freshLogs.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleSuspend = async (targetUser: User) => {
    setProcessingId(targetUser.id);
    try {
      const willSuspend = !targetUser.isSuspended;
      await api.toggleSuspendUser(targetUser.id, willSuspend);
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isSuspended: willSuspend } : u))
      );
      // Refresh audit logs
      const freshLogs = await api.getAuditLogs().catch(() => null);
      if (freshLogs?.logs) setAuditLogs(freshLogs.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const streamGrowth = stats?.streamGrowthRate ?? 0;
  const userGrowth = stats?.userGrowthRate ?? 0;
  const trackGrowth = stats?.trackGrowthRate ?? 0;
  const dailyStreams = stats?.dailyStreamingVolume || [];
  const maxDayStreams = Math.max(...dailyStreams.map((d) => d.streams), 1);

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 mb-1">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Platform Administration</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">
              Verified Root Access
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Trust & Safety Console</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Logged in as <strong className="text-white">{user.username}</strong> ({user.email}). All growth rates and metrics are computed from real database records.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Growth & Stats
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Moderation ({reports.length})
            {reports.length > 0 && (
              <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            User Directory ({usersList.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'emails'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Email Outbox ({emailOutbox.length})
          </button>
        </div>
      </div>

      {/* Real KPI Cards with True Platform Growth Rates */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Streams */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Global Streams</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-white font-mono">
            {(stats?.totalPlays ?? 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1.5 text-[11px]">
            {streamGrowth >= 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                <TrendingUp className="h-3.5 w-3.5" /> +{streamGrowth.toFixed(1)}%
              </span>
            ) : (
              <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                <TrendingDown className="h-3.5 w-3.5" /> {streamGrowth.toFixed(1)}%
              </span>
            )}
            <span className="text-zinc-500">7-day volume growth</span>
          </div>
        </div>

        {/* Registered Users */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Total Accounts</span>
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-white font-mono">
            {(stats?.totalUsers ?? usersList.length).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1.5 text-[11px]">
            {userGrowth >= 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                <TrendingUp className="h-3.5 w-3.5" /> +{userGrowth.toFixed(1)}%
              </span>
            ) : (
              <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                <TrendingDown className="h-3.5 w-3.5" /> {userGrowth.toFixed(1)}%
              </span>
            )}
            <span className="text-zinc-500">
              ({stats?.totalCreators ?? 0} creators, {stats?.totalListeners ?? 0} listeners)
            </span>
          </div>
        </div>

        {/* Catalog Tracks */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Active Catalog</span>
            <Music className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-white font-mono">
            {(stats?.totalTracks ?? 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1.5 text-[11px]">
            <span className="text-indigo-300 font-semibold">
              +{trackGrowth.toFixed(1)}%
            </span>
            <span className="text-zinc-500">catalog expansion</span>
          </div>
        </div>

        {/* Pending Reports */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Pending Triage</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-white font-mono">
            {reports.length}
          </p>
          <span className="text-[11px] text-zinc-500 mt-1.5 block">
            {stats?.resolvedReports ?? 0} resolved • {stats?.dismissedReports ?? 0} dismissed
          </span>
        </div>
      </div>

      {/* Tab 1: Platform Growth & Velocity */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Daily Streaming Velocity Chart */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-400" />
                  <span>Platform Daily Stream Velocity</span>
                </h2>
                <p className="text-xs text-zinc-400">Computed from verified real listening sessions across all tracks</p>
              </div>
              <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> 7-Day Window
              </span>
            </div>

            <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2">
              {dailyStreams.map((day, idx) => {
                const pct = Math.max(10, Math.round((day.streams / maxDayStreams) * 100));
                return (
                  <div key={`admin-bar-${day.date}-${idx}`} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[11px] font-mono text-indigo-300 opacity-0 group-hover:opacity-100 transition">
                      {day.streams.toLocaleString()}
                    </div>
                    <div
                      className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-indigo-700/50 to-indigo-500 transition-all duration-300 group-hover:from-indigo-500 group-hover:to-indigo-400"
                      style={{ height: `${pct}%` }}
                      title={`${day.date}: ${day.streams} total streams`}
                    />
                    <span className="text-[11px] font-medium text-zinc-400 truncate max-w-full">
                      {day.dayName || day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Genre Distribution */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-indigo-400" />
                <span>Catalog Genre Breakdown</span>
              </h2>
              <p className="text-xs text-zinc-400 mb-4">Real distribution calculated from all published releases</p>

              <div className="space-y-3">
                {(stats?.genreBreakdown || []).map((genre, idx) => (
                  <div key={`admin-genre-${genre.genre}-${idx}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{genre.genre}</span>
                      <span className="font-mono text-zinc-400">
                        {genre.percentage}% ({genre.trackCount} tracks • {genre.streamCount.toLocaleString()} plays)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                        style={{ width: `${genre.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Artists Leaderboard */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>Top Artists by Total Reach</span>
              </h2>
              <p className="text-xs text-zinc-400 mb-4">Ranked by aggregate catalog streams</p>

              <div className="space-y-2.5">
                {(stats?.topArtists || []).slice(0, 5).map((artist, idx) => (
                  <div
                    key={`admin-top-art-${artist.id}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-xs font-mono font-bold text-indigo-300 shrink-0">
                        #{idx + 1}
                      </span>
                      <img
                        src={artist.avatar}
                        alt={artist.artistName}
                        className="h-8 w-8 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{artist.artistName}</p>
                        <p className="text-[10px] text-zinc-400">{artist.trackCount} catalog tracks</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono font-bold text-white">
                        {artist.streamCount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-zinc-500">total plays</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Content Moderation Queue */}
      {activeTab === 'reports' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                Content Moderation Queue ({reports.length})
              </h2>
              <p className="text-xs text-zinc-400">Review flagged tracks, examine violation context, and execute takedowns.</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Loading moderation reports...</div>
          ) : reports.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 text-zinc-400">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm font-semibold text-white">Moderation Queue Clear</p>
              <p className="text-xs text-zinc-500 mt-1">No community reports pending review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report, idx) => (
                <div
                  key={`admin-report-${report.id}-${idx}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        Violation: {report.reason}
                      </span>
                      <span className="text-xs text-zinc-500">
                        Submitted on {formatDate(report.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-white">
                      Track: <span className="text-amber-300">{report.trackTitle || report.trackId}</span>
                      {report.artistName && <span className="text-zinc-400 font-normal"> by {report.artistName}</span>}
                    </p>

                    {report.notes && (
                      <p className="text-xs text-zinc-400 bg-white/5 p-2 rounded-xl">
                        "{report.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => onNavigate('track', { trackId: report.trackId })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs text-zinc-300 hover:text-white transition cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Inspect
                    </button>

                    <button
                      onClick={() => handleResolveReport(report.id, 'dismiss')}
                      disabled={processingId === report.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-semibold text-white hover:bg-white/20 transition disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Dismiss
                    </button>

                    <button
                      onClick={() => handleResolveReport(report.id, 'takedown')}
                      disabled={processingId === report.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Take Down
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: User Management */}
      {activeTab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Registered User Directory ({usersList.length})</h2>
              <p className="text-xs text-zinc-400">View registered accounts, verify roles, and suspend malicious users.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {usersList.map((u, idx) => (
                  <tr key={`admin-user-${u.id}-${idx}`} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                          alt={u.username}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{u.username}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-zinc-400 font-mono truncate">{u.email}</span>
                            {u.emailVerified ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Verified
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-zinc-700/50 text-zinc-400">
                                Unverified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          u.role === 'admin'
                            ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-300'
                            : u.role === 'creator'
                            ? 'border-amber-400/40 bg-amber-500/20 text-amber-300'
                            : 'border-cyan-400/40 bg-cyan-500/20 text-cyan-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.isSuspended ? (
                        <span className="text-red-400 font-semibold flex items-center gap-1 text-[11px]">
                          <UserX className="h-3.5 w-3.5" /> Suspended
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                          <UserCheck className="h-3.5 w-3.5" /> Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 hidden sm:table-cell">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleSuspend(u)}
                          disabled={processingId === u.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                            u.isSuspended
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                              : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {u.isSuspended ? 'Lift Suspension' : 'Suspend User'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Administrative Security Audit Trail</h2>
              <p className="text-xs text-zinc-400">Immutable ledger of administrative actions, moderation decisions, and user account changes.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            {auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">No administrative actions recorded yet.</div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log, idx) => (
                  <div
                    key={`admin-log-${log.id || idx}-${idx}`}
                    className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between gap-4 text-xs font-mono"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                          {log.action}
                        </span>
                        <span className="text-white font-semibold">{log.adminName || 'Admin'}</span>
                        <span className="text-zinc-500 text-[11px] font-sans">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-zinc-400 font-sans text-xs">
                        Target: <strong className="text-zinc-200">{log.targetType} {log.targetId}</strong>
                        {log.details?.reason && ` • Reason: ${log.details.reason}`}
                        {log.details?.note && ` • Note: ${log.details.note}`}
                        {log.details?.status && ` • New Status: ${log.details.status}`}
                      </p>
                    </div>
                    <span className="text-[10px] text-zinc-600 shrink-0 font-mono">
                      {log.id}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Email Verification Outbox */}
      {activeTab === 'emails' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">System Email Outbox & Dispatched Codes</h2>
              <p className="text-xs text-zinc-400">
                Live delivery log of 6-digit authentication and registration verification codes dispatched across the platform.
              </p>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
              {emailOutbox.length} Dispatched Messages
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            {emailOutbox.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-500">
                <Mail className="h-10 w-10 mx-auto mb-2 text-zinc-600" />
                <p className="text-sm font-semibold text-white">No verification emails dispatched yet</p>
                <p className="text-xs text-zinc-500 mt-1">Codes sent during user registration or passwordless login will appear here.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Recipient Email</th>
                    <th className="py-3 px-4">Verification Code</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Dispatched At</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {emailOutbox.map((eml, idx) => {
                    const isExpired = Date.now() > eml.expiresAt;
                    return (
                      <tr key={`admin-email-${eml.id || idx}-${idx}`} className="hover:bg-white/5 transition">
                        <td className="py-3 px-4 text-white font-sans font-medium">
                          {eml.to}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-indigo-300 font-bold bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded tracking-wider">
                            {eml.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-300 font-sans text-xs">
                          {eml.subject}
                        </td>
                        <td className="py-3 px-4 text-zinc-400 text-[11px]">
                          {new Date(eml.sentAt).toLocaleTimeString()} ({formatDate(eml.sentAt)})
                        </td>
                        <td className="py-3 px-4 text-zinc-400 text-[11px]">
                          {isExpired ? (
                            <span className="text-zinc-500">Expired</span>
                          ) : (
                            <span className="text-emerald-400">Valid</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/20 text-emerald-300">
                            Delivered
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
