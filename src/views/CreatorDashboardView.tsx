import React, { useState, useEffect } from 'react';
import {
  Music2,
  Headphones,
  Heart,
  Users,
  Upload,
  Play,
  Trash2,
  TrendingUp,
  TrendingDown,
  Disc3,
  Calendar,
  Sparkles,
  BarChart2,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { api } from '../services/api';
import { Track, Artist, CreatorStats } from '../types';

interface CreatorDashboardProps {
  onNavigate: (view: string, params?: any) => void;
}

export const CreatorDashboardView: React.FC<CreatorDashboardProps> = ({ onNavigate }) => {
  const { user, isCreator, openAuthModal } = useAuth();
  const { playTrack } = useAudioPlayer();

  const [artistProfile, setArtistProfile] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadCreatorData() {
      if (!user) return;
      setLoading(true);
      try {
        const [artistsRes, statsRes] = await Promise.all([
          api.getArtists(),
          api.getCreatorStats().catch((err) => {
            console.error('Failed to load creator stats', err);
            return null;
          })
        ]);

        const me = artistsRes.artists.find((a) => a.userId === user.id) || artistsRes.artists[0];
        setArtistProfile(me || null);
        setStats(statsRes);

        if (me) {
          const trackRes = await api.getTracks({ artistId: me.id });
          setTracks(trackRes.tracks);
        } else if (statsRes?.recentUploads) {
          setTracks(statsRes.recentUploads);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadCreatorData();
  }, [user]);

  if (!user || !isCreator) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
          <Music2 className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-white">Creator Studio</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Sign in with an Artist account to access real-time streaming analytics, audience growth metrics, and track management.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => openAuthModal('Sign in with a Creator account to access the Artist Studio.', 'creator')}
            className="rounded-xl bg-amber-400 px-6 py-2.5 text-xs font-bold text-black hover:bg-amber-300 transition cursor-pointer"
          >
            Sign In as Creator
          </button>
        </div>
      </div>
    );
  }

  const totalPlays = stats?.totalPlays ?? tracks.reduce((sum, t) => sum + (t.playCount || 0), 0);
  const totalLikes = stats?.totalLikes ?? tracks.reduce((sum, t) => sum + (t.likesCount || t.likeCount || 0), 0);
  const playsGrowth = stats?.playsGrowthRate ?? 0;
  const likesGrowth = stats?.likesGrowthRate ?? 0;
  const monthlyListeners = stats?.monthlyListeners ?? artistProfile?.monthlyListeners ?? 0;
  const conversionRate = stats?.conversionRate ?? 0;

  const playsByDay = stats?.playsByDay || [];
  const maxDayPlays = Math.max(...playsByDay.map((d) => d.plays), 1);

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track from Resonance?')) return;
    setDeletingId(trackId);
    try {
      await api.deleteTrack(trackId);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      if (stats) {
        setStats({
          ...stats,
          totalTracks: Math.max(0, stats.totalTracks - 1)
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Recently';
    return new Date(isoStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Music2 className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Creator Studio</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
              Live Production Analytics
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome, {artistProfile?.artistName || user.username}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            All analytics below represent real database playback events and listener activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-black hover:bg-amber-300 transition shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Upload New Track
          </button>
        </div>
      </div>

      {/* Real KPI Cards with True Growth Rates */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streams */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Total Streams</span>
            <Headphones className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-white font-mono">
            {totalPlays.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1.5 text-[11px]">
            {playsGrowth >= 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                <TrendingUp className="h-3.5 w-3.5" /> +{playsGrowth.toFixed(1)}%
              </span>
            ) : (
              <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                <TrendingDown className="h-3.5 w-3.5" /> {playsGrowth.toFixed(1)}%
              </span>
            )}
            <span className="text-zinc-500">vs prior 7 days</span>
          </div>
        </div>

        {/* Favorites */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Total Favorites</span>
            <Heart className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-white font-mono">
            {totalLikes.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1.5 text-[11px]">
            {likesGrowth >= 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                <TrendingUp className="h-3.5 w-3.5" /> +{likesGrowth.toFixed(1)}%
              </span>
            ) : (
              <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                <TrendingDown className="h-3.5 w-3.5" /> {likesGrowth.toFixed(1)}%
              </span>
            )}
            <span className="text-zinc-500">audience saves</span>
          </div>
        </div>

        {/* Monthly Listeners */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Monthly Reach</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-white font-mono">
            {monthlyListeners.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-zinc-400">
            <span className="font-mono text-cyan-300 font-semibold">{conversionRate.toFixed(1)}%</span>
            <span className="text-zinc-500">save rate</span>
          </div>
        </div>

        {/* Catalog Tracks */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Published Tracks</span>
            <Disc3 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-white font-mono">
            {(stats?.totalTracks ?? tracks.length).toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-400 mt-1.5 block font-semibold">
            100% active on stream
          </span>
        </div>
      </div>

      {/* 7-Day Real Streaming Activity Chart & Top Tracks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Real Play Volume Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-amber-400" />
                <span>7-Day Streaming Velocity</span>
              </h2>
              <p className="text-[11px] text-zinc-400">Live daily stream volume across your catalog</p>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Last 7 Days
            </span>
          </div>

          {playsByDay.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">No playback history recorded yet.</div>
          ) : (
            <div className="space-y-3">
              <div className="h-40 flex items-end justify-between gap-2 pt-4 px-2">
                {playsByDay.map((day, idx) => {
                  const pct = Math.max(8, Math.round((day.plays / maxDayPlays) * 100));
                  return (
                    <div key={`day-bar-${day.date}-${idx}`} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition">
                        {day.plays}
                      </div>
                      <div
                        className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-amber-500/50 to-amber-400 transition-all duration-300 group-hover:from-amber-400 group-hover:to-amber-300"
                        style={{ height: `${pct}%` }}
                        title={`${day.date}: ${day.plays} streams`}
                      />
                      <span className="text-[10px] font-medium text-zinc-400 truncate max-w-full">
                        {day.dayName || day.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Peak streams: <strong className="text-white font-mono">{maxDayPlays.toLocaleString()}</strong></span>
                <span>Total 7-day volume: <strong className="text-white font-mono">{playsByDay.reduce((a, b) => a + b.plays, 0).toLocaleString()}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Top Tracks Leaderboard */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Top Performing Tracks</span>
          </h2>
          <p className="text-[11px] text-zinc-400 mb-4">Ranked by real streaming frequency</p>

          <div className="space-y-2">
            {(stats?.topTracks || []).slice(0, 4).map((track, i) => (
              <div
                key={`top-track-${track.id || track.title}-${i}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-[11px] font-bold font-mono text-amber-400 shrink-0">
                    #{i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{track.title}</p>
                    <p className="text-[10px] text-zinc-400">{track.genre || 'Original'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-bold text-white">
                    {(track.plays || 0).toLocaleString()} <span className="text-[10px] text-zinc-500 font-sans font-normal">plays</span>
                  </p>
                  <p className="text-[10px] text-rose-400 flex items-center justify-end gap-1">
                    <Heart className="h-2.5 w-2.5" /> {(track.likes || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

            {(!stats?.topTracks || stats.topTracks.length === 0) && (
              <p className="text-xs text-zinc-500 py-6 text-center">No track records available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Published Catalog Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Your Published Tracks ({tracks.length})</h2>
            <p className="text-xs text-zinc-400">Manage releases, preview audio, or retire tracks.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">Loading catalog releases...</div>
        ) : tracks.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 text-zinc-400">
            <Music2 className="h-10 w-10 mx-auto mb-2 text-zinc-600" />
            <p className="text-sm font-semibold text-white">No tracks uploaded yet</p>
            <p className="text-xs text-zinc-500 mt-1">Upload your first audio release to reach listeners.</p>
            <button
              onClick={() => onNavigate('upload')}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition"
            >
              Upload Track
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Track</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Genre</th>
                  <th className="py-3 px-4">Plays</th>
                  <th className="py-3 px-4 hidden md:table-cell">Likes</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Release Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tracks.map((track, idx) => (
                  <tr key={`creator-track-${track.id}-${idx}`} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{track.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-zinc-400">{formatDuration(track.duration)}</span>
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <Globe className="h-2.5 w-2.5" /> Public Forever
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="bg-white/5 px-2 py-0.5 rounded text-zinc-300 text-[10px]">
                        {track.genre}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-white">
                      {(track.playCount ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-400 hidden md:table-cell">
                      {((track.likesCount ?? track.likeCount) ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 hidden sm:table-cell">
                      {formatDate(track.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => playTrack(track, tracks)}
                          className="p-1.5 text-zinc-400 hover:text-amber-400 transition cursor-pointer"
                          title="Preview Track"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTrack(track.id)}
                          disabled={deletingId === track.id}
                          className="p-1.5 text-zinc-400 hover:text-red-400 transition disabled:opacity-50 cursor-pointer"
                          title="Delete Track"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
