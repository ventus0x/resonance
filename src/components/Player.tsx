import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  Mic2,
  Maximize2
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/formatters';

interface PlayerProps {
  onNavigateTrack: (trackId: string) => void;
  onNavigateArtist: (artistId: string) => void;
}

export const Player: React.FC<PlayerProps> = ({ onNavigateTrack, onNavigateArtist }) => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleQueue,
    toggleLyrics,
    toggleFullscreenPlayer
  } = useAudioPlayer();

  const { isLiked, toggleLike } = useAuth();

  if (!currentTrack) {
    return null;
  }

  const liked = isLiked(currentTrack.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      id="global-audio-player"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#090d18]/95 backdrop-blur-xl px-4 py-2.5 md:py-3 transition-all"
    >
      {/* Top scrubber bar (Full width responsive drag bar) */}
      <div
        className="relative group -mt-2.5 md:-mt-3 mb-1 cursor-pointer w-full py-2"
      >
        <div className="h-1 group-hover:h-2 w-full bg-white/10 rounded-full overflow-hidden transition-all">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left: Track Details */}
        <div className="flex items-center gap-3 min-w-0 w-1/3 md:w-1/4">
          <div
            onClick={() => onNavigateTrack(currentTrack.id)}
            className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden cursor-pointer group shadow-md"
          >
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="h-full w-full object-cover group-hover:scale-105 transition"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="flex items-end gap-0.5 h-3">
                  <span className="w-0.5 bg-amber-400 animate-pulse h-2" />
                  <span className="w-0.5 bg-amber-400 animate-pulse h-3" />
                  <span className="w-0.5 bg-amber-400 animate-pulse h-1" />
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h4
              onClick={() => onNavigateTrack(currentTrack.id)}
              className="text-sm font-semibold text-white truncate cursor-pointer hover:text-amber-400 transition"
            >
              {currentTrack.title}
            </h4>
            <p
              onClick={() => onNavigateArtist(currentTrack.artistId)}
              className="text-xs text-zinc-400 truncate cursor-pointer hover:text-zinc-200 transition"
            >
              {currentTrack.artistName}
            </p>
          </div>

          <button
            onClick={() => toggleLike(currentTrack.id)}
            className={`hidden sm:flex p-1.5 rounded-full transition cursor-pointer ${
              liked ? 'text-amber-400' : 'text-zinc-500 hover:text-white'
            }`}
            title={liked ? 'Unlike' : 'Like'}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center: Controls & Timers */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-lg">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={toggleShuffle}
              className={`hidden sm:flex p-1.5 rounded-full transition ${
                shuffle ? 'text-amber-400' : 'text-zinc-500 hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </button>

            <button
              onClick={prevTrack}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/5 rounded-full transition cursor-pointer"
              title="Previous Track"
            >
              <SkipBack className="h-5 w-5 fill-current" />
            </button>

            <button
              id="player-play-pause-btn"
              onClick={togglePlay}
              className="relative flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-black shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5" />
              )}
              {isBuffering && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-black/20"></span>
                </span>
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/5 rounded-full transition cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="h-5 w-5 fill-current" />
            </button>

            <button
              onClick={toggleRepeat}
              className={`hidden sm:flex p-1.5 rounded-full transition ${
                repeat !== 'off' ? 'text-amber-400' : 'text-zinc-500 hover:text-white'
              }`}
              title={`Repeat: ${repeat}`}
            >
              <Repeat className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-zinc-500 mt-1">
            <span>{formatDuration(currentTime)}</span>
            <span>/</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Right: Auxiliary & Volume */}
        <div className="flex items-center justify-end gap-2 md:gap-3 w-1/3 md:w-1/4">
          <button
            onClick={toggleLyrics}
            className="hidden md:flex p-1.5 text-zinc-400 hover:text-amber-400 rounded-full transition cursor-pointer"
            title="Lyrics"
          >
            <Mic2 className="h-4 w-4" />
          </button>

          <button
            onClick={toggleQueue}
            className="p-1.5 text-zinc-400 hover:text-amber-400 rounded-full transition cursor-pointer"
            title="Queue"
          >
            <ListMusic className="h-4 w-4" />
          </button>

          {/* Volume slider */}
          <div className="hidden lg:flex items-center gap-2 group w-24">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <button
            onClick={toggleFullscreenPlayer}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full transition cursor-pointer"
            title="Full Screen View"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
