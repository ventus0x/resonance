import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Play, Music, ListMusic } from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { formatDuration } from '../utils/formatters';

export const QueueDrawer: React.FC = () => {
  const {
    currentTrack,
    queue,
    history,
    isQueueOpen,
    toggleQueue,
    playTrack,
    removeFromQueue,
    clearQueue
  } = useAudioPlayer();

  if (!isQueueOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={toggleQueue} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-[#0d1220] border-l border-white/10 p-6 flex flex-col text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-amber-400" />
            <h3 className="font-bold text-lg text-white">Play Queue</h3>
          </div>
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 transition px-2 py-1 rounded-md hover:bg-white/5"
                title="Clear Queue"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
            <button
              onClick={toggleQueue}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Current Track */}
        {currentTrack && (
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
              Now Playing
            </h4>
            <div className="flex items-center gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="h-12 w-12 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{currentTrack.title}</p>
                <p className="text-xs text-zinc-400 truncate">{currentTrack.artistName}</p>
              </div>
              <span className="text-xs font-mono text-amber-300">
                {formatDuration(currentTrack.duration)}
              </span>
            </div>
          </div>
        )}

        {/* Upcoming in Queue */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Up Next ({queue.length})
              </h4>
            </div>

            {queue.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs border border-dashed border-white/5 rounded-2xl">
                <Music className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                Queue is empty. Add songs using "Add to Queue".
              </div>
            ) : (
              <div className="space-y-1.5">
                {queue.map((track, idx) => (
                  <div
                    key={`queue-item-${track.id}-${idx}`}
                    className="group flex items-center justify-between rounded-xl p-2 hover:bg-white/5 transition"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => playTrack(track, queue.slice(idx + 1))}
                    >
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate group-hover:text-amber-400 transition">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">{track.artistName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-zinc-500">
                        {formatDuration(track.duration)}
                      </span>
                      <button
                        onClick={() => removeFromQueue(idx)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-400 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 1 && (
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Recently Played
              </h4>
              <div className="space-y-1.5">
                {history.slice(1, 6).map((track, idx) => (
                  <div
                    key={`history-item-${track.id}-${idx}`}
                    onClick={() => playTrack(track)}
                    className="flex items-center justify-between rounded-xl p-2 hover:bg-white/5 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="h-9 w-9 rounded-lg object-cover opacity-75 group-hover:opacity-100"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-300 truncate group-hover:text-white">
                          {track.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">{track.artistName}</p>
                      </div>
                    </div>
                    <Play className="h-3.5 w-3.5 text-zinc-500 opacity-0 group-hover:opacity-100" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
