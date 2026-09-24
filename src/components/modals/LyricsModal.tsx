import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic2, Disc3 } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';

export const LyricsModal: React.FC = () => {
  const { currentTrack, isLyricsOpen, toggleLyrics } = useAudioPlayer();

  if (!isLyricsOpen || !currentTrack) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative flex flex-col h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#141b2d] to-[#0a0d16] text-white shadow-2xl"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Mic2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-tight">{currentTrack.title}</h3>
                <p className="text-xs text-zinc-400">{currentTrack.artistName} {currentTrack.albumTitle ? `• ${currentTrack.albumTitle}` : ''}</p>
              </div>
            </div>
            <button
              onClick={toggleLyrics}
              className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Lyrics Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-4">
            {currentTrack.lyrics ? (
              <div className="whitespace-pre-line text-lg md:text-2xl font-semibold leading-relaxed tracking-wide text-zinc-200">
                {currentTrack.lyrics.split('\n\n').map((verse, idx) => (
                  <p
                    key={`verse-${currentTrack.id}-${idx}`}
                    className="mb-6 hover:text-amber-400 transition-colors duration-200"
                  >
                    {verse}
                  </p>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
                <Disc3 className="h-12 w-12 text-zinc-600 mb-3 animate-spin" style={{ animationDuration: '8s' }} />
                <p className="text-base font-medium text-zinc-300">Instrumental or No Lyrics Available</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                  This track does not have published lyrics provided by the artist yet.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
