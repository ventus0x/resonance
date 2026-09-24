import React, { useState } from 'react';
import { Play, Pause, Heart, MoreVertical, Plus, ShieldAlert, Disc3 } from 'lucide-react';
import type { Track } from '../types';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/formatters';

interface TrackRowProps {
  track: Track;
  index: number;
  onNavigateTrack: (id: string) => void;
  onNavigateArtist: (id: string) => void;
  allTracks?: Track[];
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  onNavigateTrack,
  onNavigateArtist,
  allTracks
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();
  const { isLiked, toggleLike, openPlaylistModal, openReportModal } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isCurrent = currentTrack?.id === track.id;
  const isThisPlaying = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, allTracks);
    }
  };

  return (
    <div
      onClick={() => onNavigateTrack(track.id)}
      className={`group flex items-center justify-between rounded-xl px-3 py-2.5 transition cursor-pointer ${
        isCurrent ? 'bg-amber-500/10 text-amber-300' : 'hover:bg-white/5 text-zinc-300'
      }`}
    >
      {/* Left: Index or Play icon */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-7 text-center shrink-0">
          <span className={`text-xs font-mono group-hover:hidden ${isCurrent ? 'text-amber-400 font-bold' : 'text-zinc-500'}`}>
            {index + 1}
          </span>
          <button
            onClick={handlePlayClick}
            className="hidden group-hover:flex items-center justify-center mx-auto text-amber-400 hover:scale-110 transition cursor-pointer"
          >
            {isThisPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          </button>
        </div>

        {/* Thumbnail */}
        <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-zinc-800">
          <img
            src={track.coverUrl}
            alt={track.title}
            className="h-full w-full object-cover"
          />
          {isThisPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Disc3 className="h-4 w-4 text-amber-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Title & Artist */}
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-amber-400' : 'text-white group-hover:text-amber-300'}`}>
            {track.title}
          </p>
          <p
            onClick={(e) => {
              e.stopPropagation();
              onNavigateArtist(track.artistId);
            }}
            className="text-xs text-zinc-400 truncate hover:text-zinc-200"
          >
            {track.artistName}
          </p>
        </div>
      </div>

      {/* Middle: Album & Genre (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-6 flex-1 min-w-0 px-4">
        <span className="text-xs text-zinc-400 truncate flex-1">
          {track.albumTitle || '—'}
        </span>
        <span className="text-[11px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 shrink-0">
          {track.genre}
        </span>
      </div>

      {/* Right: Playing Now, Plays, Likes, Duration, & Menu */}
      <div className="flex items-center gap-3 shrink-0">
        {((track.playingNow ?? 0) > 0 || isThisPlaying) && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{Math.max(track.playingNow ?? 0, isThisPlaying ? 1 : 0)} live</span>
          </span>
        )}

        <span className="hidden sm:inline text-xs font-mono text-zinc-500" title="Total plays">
          {(track.playCount ?? 0).toLocaleString()} plays
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(track.id);
            }}
            className={`p-1.5 rounded-full transition cursor-pointer flex items-center gap-1 ${
              liked ? 'text-amber-400' : 'text-zinc-500 hover:text-white opacity-80 group-hover:opacity-100'
            }`}
            title="Like track"
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-current opacity-100' : ''}`} />
            <span className="text-[11px] font-mono text-zinc-400">
              {(track.likesCount ?? 0).toLocaleString()}
            </span>
          </button>
        </div>

        <span className="text-xs font-mono text-zinc-400 w-10 text-right">
          {formatDuration(track.duration)}
        </span>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 text-zinc-500 hover:text-white rounded-full transition"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/10 bg-[#141b2c] p-1.5 shadow-2xl text-xs z-30"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  openPlaylistModal(track.id);
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-zinc-300 hover:bg-white/5 hover:text-white text-left"
              >
                <Plus className="h-3.5 w-3.5 text-amber-400" />
                Add to Playlist
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  openReportModal(track.id, track.title, track.artistName);
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 text-left"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Report Track
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
