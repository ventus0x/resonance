import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Heart,
  Share2,
  Plus,
  ShieldAlert,
  Mic2,
  Headphones,
  Check,
  Globe,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import type { Track } from '../types';
import { api } from '../services/api';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useAuth } from '../context/AuthContext';
import { formatDuration, formatDate } from '../utils/formatters';
import { TrackRow } from '../components/TrackRow';

interface TrackViewProps {
  trackId: string;
  onNavigate: (view: string, params?: any) => void;
}

export const TrackView: React.FC<TrackViewProps> = ({ trackId, onNavigate }) => {
  const [track, setTrack] = useState<Track | null>(null);
  const [relatedTracks, setRelatedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { currentTrack, isPlaying, playTrack, togglePlay, toggleLyrics } = useAudioPlayer();
  const { user, artist, isAdmin, isLiked, toggleLike, openPlaylistModal, openReportModal } = useAuth();

  const isUploader = user && (user.id === track?.uploadedByUserId || (artist && artist.id === track?.artistId));
  const canDelete = isAdmin || isUploader;

  useEffect(() => {
    async function loadTrack() {
      setLoading(true);
      try {
        const res = await api.getTrackById(trackId);
        setTrack(res.track);
        if (res.track) {
          const artistTracksRes = await api.getTracks({ artistId: res.track.artistId });
          setRelatedTracks(artistTracksRes.tracks.filter((t) => t.id !== res.track.id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTrack();
  }, [trackId]);

  if (loading) {
    return <div className="py-24 text-center text-xs text-zinc-500">Loading track details...</div>;
  }

  if (!track) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Track Not Found</h2>
        <p className="text-xs text-zinc-400 mb-4">This track may have been removed or is unavailable.</p>
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold"
        >
          Return Home
        </button>
      </div>
    );
  }

  const isCurrent = currentTrack?.id === track.id;
  const isThisPlaying = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, relatedTracks);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteTrack = async () => {
    if (!track) return;
    setDeleteError('');
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('resonance_token');
      const res = await fetch(`/api/tracks/${track.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete track');
      onNavigate(isUploader ? 'creator-dashboard' : 'home');
    } catch (err: any) {
      setDeleteError(err.message || 'Deletion failed');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 rounded-3xl bg-gradient-to-b from-amber-500/10 via-white/[0.02] to-transparent p-6 md:p-8 border border-white/10">
        <div className="relative aspect-square w-48 md:w-56 rounded-2xl overflow-hidden shadow-2xl shrink-0 bg-zinc-900 border border-white/10">
          <img src={track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
        </div>

        <div className="flex-1 text-center md:text-left space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {track.genre}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Globe className="h-3 w-3" />
              Public Forever
            </span>
            {track.albumTitle && (
              <span className="text-xs text-zinc-400">
                Album: <button onClick={() => onNavigate('album', { albumId: track.albumId })} className="text-white hover:underline">{track.albumTitle}</button>
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight break-words">
            {track.title}
          </h1>

          <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-zinc-300">
            <button
              onClick={() => onNavigate('artist', { artistId: track.artistId })}
              className="font-bold text-white hover:text-amber-400 transition"
            >
              {track.artistName}
            </button>
            <span>•</span>
            <span>{formatDate(track.createdAt)}</span>
            <span>•</span>
            <span>{formatDuration(track.duration)}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 text-xs font-mono text-zinc-400 pt-1">
            <span className="flex items-center gap-1.5" title="Total real play count">
              <Headphones className="h-4 w-4 text-amber-400" />
              {(track.playCount ?? 0).toLocaleString()} plays
            </span>
            <span className="flex items-center gap-1.5" title="Total real likes">
              <Heart className="h-4 w-4 text-rose-400" />
              {((track.likesCount ?? track.likeCount) ?? 0).toLocaleString()} likes
            </span>
            {((track.playingNow ?? 0) > 0 || isThisPlaying) && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-sans">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {Math.max(track.playingNow ?? 0, isThisPlaying ? 1 : 0)} listening now
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              {isThisPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
              <span>{isThisPlaying ? 'Pause' : 'Stream Free'}</span>
            </button>

            <button
              onClick={() => toggleLike(track.id)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                liked
                  ? 'border-amber-500/40 bg-amber-500/20 text-amber-400'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Like"
            >
              <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => openPlaylistModal(track.id)}
              className="p-3 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Add to Playlist"
            >
              <Plus className="h-5 w-5" />
            </button>

            <button
              onClick={handleShare}
              className="p-3 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Share Link"
            >
              {copied ? <Check className="h-5 w-5 text-emerald-400" /> : <Share2 className="h-5 w-5" />}
            </button>

            <button
              onClick={() => openReportModal(track.id, track.title, track.artistName)}
              className="p-3 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
              title="Report Track"
            >
              <ShieldAlert className="h-5 w-5" />
            </button>

            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition cursor-pointer ml-auto"
                title={isAdmin ? "Delete Track (Admin)" : "Delete Track (Uploader)"}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#121624] p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">Delete Public Forever Track?</h3>
                <p className="text-xs text-zinc-400">
                  {isAdmin ? 'Administrator Removal' : 'Original Uploader Removal'}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              This track is permanently public on Resonance. Deleting it will irrevocably remove it from all discovery feeds, user playlists, and artist catalog.
            </p>

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteTrack}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lyrics Preview Section */}
      {track.lyrics && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mic2 className="h-5 w-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Lyrics</h3>
            </div>
            <button
              onClick={toggleLyrics}
              className="text-xs text-amber-400 hover:underline"
            >
              Open Full Screen
            </button>
          </div>
          <p className="whitespace-pre-line text-sm text-zinc-300 line-clamp-6 leading-relaxed font-sans">
            {track.lyrics}
          </p>
        </div>
      )}

      {/* More from this Artist */}
      {relatedTracks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">More by {track.artistName}</h3>
            <button
              onClick={() => onNavigate('artist', { artistId: track.artistId })}
              className="text-xs text-amber-400 hover:underline"
            >
              View Artist Profile
            </button>
          </div>

          <div className="space-y-1">
            {relatedTracks.slice(0, 5).map((relTrack, idx) => (
              <TrackRow
                key={`rel-track-${relTrack.id}-${idx}`}
                track={relTrack}
                index={idx}
                onNavigateTrack={(id) => onNavigate('track', { trackId: id })}
                onNavigateArtist={(id) => onNavigate('artist', { artistId: id })}
                allTracks={relatedTracks}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
