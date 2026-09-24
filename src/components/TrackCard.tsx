import React from 'react';
import { Play, Pause, Heart, MoreVertical, Plus, ShieldAlert } from 'lucide-react';
import type { Track } from '../types';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/formatters';

interface TrackCardProps {
  track: Track;
  onNavigateTrack: (id: string) => void;
  onNavigateArtist: (id: string) => void;
  allTracks?: Track[];
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  onNavigateTrack,
  onNavigateArtist,
  allTracks
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();
  const { isLiked, toggleLike, openPlaylistModal, openReportModal } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);

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
      className="group relative flex flex-col rounded-2xl bg-white/[0.03] p-3.5 border border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition duration-200 cursor-pointer"
    >
      {/* Artwork container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-zinc-900 shadow-md">
        <img
          src={track.coverUrl}
          alt={track.title}
          className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
          loading="lazy"
        />

        {/* Play overlay button */}
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition duration-200 ${
            isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <button
            onClick={handlePlayClick}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-400 text-black shadow-xl shadow-amber-500/30 hover:scale-110 active:scale-95 transition cursor-pointer"
          >
            {isThisPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Genre Pill badge */}
        <span className="absolute top-2 left-2 text-[10px] font-semibold bg-black/60 backdrop-blur-md text-zinc-300 px-2 py-0.5 rounded-md border border-white/10">
          {track.genre}
        </span>

        {/* Live Playing Now Indicator */}
        {((track.playingNow ?? 0) > 0 || isThisPlaying) && (
          <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold bg-emerald-950/80 backdrop-blur-md text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30 shadow-lg shadow-emerald-900/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{Math.max(track.playingNow ?? 0, isThisPlaying ? 1 : 0)} live</span>
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-white truncate group-hover:text-amber-300 transition">
            {track.title}
          </h4>
          <p
            onClick={(e) => {
              e.stopPropagation();
              onNavigateArtist(track.artistId);
            }}
            className="text-xs text-zinc-400 truncate hover:text-zinc-200 transition mt-0.5"
          >
            {track.artistName}
          </p>
        </div>

        {/* Like & Menu */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(track.id);
            }}
            className={`p-1.5 rounded-full transition cursor-pointer ${
              liked ? 'text-amber-400' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
          </button>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1.5 text-zinc-500 hover:text-white rounded-full transition"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 bottom-full mb-2 w-44 rounded-xl border border-white/10 bg-[#141b2c] p-1.5 shadow-2xl text-xs z-30"
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
                  Report Content
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mt-2 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2 truncate">
          <span title="Total plays">{(track.playCount ?? 0).toLocaleString()} plays</span>
          <span>•</span>
          <span title="Total likes" className="flex items-center gap-0.5 text-zinc-400">
            <Heart className="h-3 w-3 text-rose-400 fill-rose-400/80" />
            {(track.likesCount ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="shrink-0 text-right">
          {((track.playingNow ?? 0) > 0 || isThisPlaying) ? (
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 font-sans">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {Math.max(track.playingNow ?? 0, isThisPlaying ? 1 : 0)} now
            </span>
          ) : (
            <span className="text-zinc-500">{formatDuration(track.duration)}</span>
          )}
        </div>
      </div>
    </div>
  );
};
