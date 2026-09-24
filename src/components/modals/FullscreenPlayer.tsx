import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
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
  Mic2
} from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useAuth } from '../../context/AuthContext';
import { formatDuration } from '../../utils/formatters';

export const FullscreenPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    isFullscreenPlayer,
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

  if (!isFullscreenPlayer || !currentTrack) return null;

  const liked = isLiked(currentTrack.id);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-50 flex flex-col justify-between bg-gradient-to-b from-[#182035] via-[#0d1222] to-[#080b14] p-6 md:p-12 text-white overflow-hidden"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
          <button
            onClick={toggleFullscreenPlayer}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
          <div className="text-center">
            <span className="text-[11px] font-semibold tracking-wider text-amber-400 uppercase">
              Now Playing
            </span>
            <p className="text-xs text-zinc-400 font-medium">
              {currentTrack.albumTitle || currentTrack.genre}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLyrics}
              className="p-2 rounded-full text-zinc-400 hover:text-amber-400 hover:bg-white/10 transition"
              title="Lyrics"
            >
              <Mic2 className="h-5 w-5" />
            </button>
            <button
              onClick={toggleQueue}
              className="p-2 rounded-full text-zinc-400 hover:text-amber-400 hover:bg-white/10 transition"
              title="Queue"
            >
              <ListMusic className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Center Artwork & Visualizer */}
        <div className="flex flex-col items-center justify-center my-auto py-6 max-w-lg mx-auto w-full">
          <div className="relative group mb-8">
            <div className="relative aspect-square w-64 md:w-80 rounded-3xl overflow-hidden shadow-2xl shadow-black/80 border border-white/10">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Glowing ambient ring */}
            <div className="absolute -inset-4 rounded-3xl bg-amber-500/10 blur-2xl -z-10 group-hover:bg-amber-500/20 transition duration-500" />
          </div>

          <div className="w-full flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white line-clamp-1">
                {currentTrack.title}
              </h2>
              <p className="text-base text-zinc-400 mt-1 font-medium">
                {currentTrack.artistName}
              </p>
            </div>
            <button
              onClick={() => toggleLike(currentTrack.id)}
              className={`p-3 rounded-full transition cursor-pointer ${
                liked ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Heart className={`h-6 w-6 ${liked ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Animated Equalizer Waveform */}
          <div className="w-full mt-6 flex items-center justify-center gap-1.5 h-12">
            {(currentTrack.waveform || [0.3, 0.6, 0.8, 0.4, 0.9, 0.5, 0.7, 0.4, 0.8, 0.3]).slice(0, 32).map((val, idx) => (
              <span
                key={`waveform-bar-${idx}`}
                className={`w-1 rounded-full bg-gradient-to-t from-amber-500 to-orange-400 transition-all duration-300 ${
                  isPlaying ? 'opacity-80' : 'opacity-30'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(12, val * 46 + (Math.sin(idx + currentTime * 5) * 8))}px` : `${Math.max(8, val * 24)}px`
                }}
              />
            ))}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="w-full max-w-xl mx-auto space-y-4">
          {/* Scrubber */}
          <div>
            <div className="relative group py-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-400 font-mono">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-full transition ${shuffle ? 'text-amber-400' : 'text-zinc-400 hover:text-white'}`}
            >
              <Shuffle className="h-5 w-5" />
            </button>
            <button
              onClick={prevTrack}
              className="p-3 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition"
            >
              <SkipBack className="h-7 w-7 fill-current" />
            </button>
            <button
              onClick={togglePlay}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-black shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition"
            >
              {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current ml-1" />}
            </button>
            <button
              onClick={nextTrack}
              className="p-3 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition"
            >
              <SkipForward className="h-7 w-7 fill-current" />
            </button>
            <button
              onClick={toggleRepeat}
              className={`p-2 rounded-full transition ${repeat !== 'off' ? 'text-amber-400' : 'text-zinc-400 hover:text-white'}`}
            >
              <Repeat className="h-5 w-5" />
            </button>
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition">
              {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
