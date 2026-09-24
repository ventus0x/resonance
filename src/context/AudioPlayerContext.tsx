import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { Track, RepeatMode } from '../types';
import { api } from '../services/api';

interface AudioPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: Track[];
  history: Track[];
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  isFullscreenPlayer: boolean;
  // Controls
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (timeInSeconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleQueue: () => void;
  toggleLyrics: () => void;
  toggleFullscreenPlayer: () => void;
  setIsLyricsOpen: (open: boolean) => void;
  setIsFullscreenPlayer: (open: boolean) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

// Generate anonymous session token for analytics
function getAnonymousSessionId(): string {
  let sid = localStorage.getItem('resonance_anon_session');
  if (!sid) {
    sid = 'anon_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem('resonance_anon_session', sid);
  }
  return sid;
}

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const queuedVideoIdRef = useRef<string | null>(null);
  const activeEngineRef = useRef<'html5' | 'youtube'>('html5');
  const currentTrackRef = useRef<Track | null>(null);
  const playRequestIdRef = useRef<number>(0);
  const handleTrackEndRef = useRef<() => void>(() => {});

  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => {
    try {
      const saved = localStorage.getItem('resonance_last_track');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sync currentTrackRef
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('resonance_volume');
    return saved ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');

  const [queue, setQueue] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem('resonance_queue');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter((t): t is Track => Boolean(t && t.id)) : [];
    } catch {
      return [];
    }
  });

  const [history, setHistory] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem('resonance_history');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter((t): t is Track => Boolean(t && t.id)) : [];
    } catch {
      return [];
    }
  });

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isFullscreenPlayer, setIsFullscreenPlayer] = useState(false);

  // Initialize YouTube IFrame Player engine
  useEffect(() => {
    let checkInterval: any = null;

    const setupPlayer = () => {
      const YT = (window as any).YT;
      if (!YT || !YT.Player) {
        return false;
      }
      try {
        const player = new YT.Player('resonance-yt-engine', {
          height: '200',
          width: '200',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              const p = event?.target || ytPlayerRef.current;
              isYtReadyRef.current = true;
              ytPlayerRef.current = p;
              try {
                if (typeof p?.setVolume === 'function') {
                  p.setVolume(isMuted ? 0 : volume * 100);
                }
              } catch {}
              if (queuedVideoIdRef.current) {
                const vid = queuedVideoIdRef.current;
                queuedVideoIdRef.current = null;
                try {
                  if (typeof p?.loadVideoById === 'function') {
                    p.loadVideoById(vid);
                    p.playVideo?.();
                  }
                } catch {}
              }
            },
            onStateChange: (event: any) => {
              const p = event?.target || ytPlayerRef.current;
              const state = event?.data;
              // 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 0 = ENDED
              if (state === 1) {
                setIsPlaying(true);
                setIsBuffering(false);
                try {
                  if (typeof p?.getDuration === 'function') {
                    const d = p.getDuration();
                    if (typeof d === 'number' && d > 0 && !isNaN(d)) {
                      setDuration(d);
                    }
                  }
                } catch {}
              } else if (state === 2) {
                setIsPlaying(false);
                setIsBuffering(false);
              } else if (state === 3) {
                setIsBuffering(true);
              } else if (state === 0) {
                setIsBuffering(false);
                handleTrackEndRef.current();
              }
            },
            onError: async (event: any) => {
              console.warn('YouTube engine error code:', event?.data);
              setIsBuffering(false);
              const p = event?.target || ytPlayerRef.current;
              const current = currentTrackRef.current;
              if (current && (event?.data === 150 || event?.data === 101 || event?.data === 100)) {
                try {
                  const fallbackRes = await api.resolveYouTube(current.title, current.artistName, 'audio lyrics');
                  if (fallbackRes.videoId && fallbackRes.videoId !== current.youtubeId) {
                    current.youtubeId = fallbackRes.videoId;
                    if (typeof p?.loadVideoById === 'function') {
                      p.loadVideoById(fallbackRes.videoId);
                      p.playVideo?.();
                    }
                    return;
                  }
                } catch {}
              }
              // Fallback to HTML5 audio if available
              if (current?.audioUrl && !current.audioUrl.startsWith('/api/stream?videoId=')) {
                activeEngineRef.current = 'html5';
                if (audioRef.current) {
                  audioRef.current.src = current.audioUrl;
                  audioRef.current.play().catch(() => {});
                }
              }
            }
          }
        });
        return true;
      } catch (err) {
        console.warn('YouTube setup error:', err);
        return false;
      }
    };

    if (!setupPlayer()) {
      checkInterval = setInterval(() => {
        if (setupPlayer()) {
          clearInterval(checkInterval);
        }
      }, 400);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {}
    };
  }, []);

  // Sync YouTube current playback progress and duration
  useEffect(() => {
    if (!isPlaying || activeEngineRef.current !== 'youtube') return;

    const interval = setInterval(() => {
      const p = ytPlayerRef.current;
      if (p && isYtReadyRef.current) {
        try {
          if (typeof p.getCurrentTime === 'function') {
            const ct = p.getCurrentTime();
            if (typeof ct === 'number' && !isNaN(ct)) {
              setCurrentTime(ct);
            }
          }
          if (typeof p.getDuration === 'function') {
            const d = p.getDuration();
            if (typeof d === 'number' && d > 0 && !isNaN(d)) {
              setDuration(d);
            }
          }
        } catch {}
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Initialize HTML5 Audio instance with eager buffering and fast recovery
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (activeEngineRef.current === 'html5') {
        setCurrentTime(audio.currentTime);
        if (audio.currentTime > 0) {
          setIsBuffering(false);
        }
      }
    };

    const handleLoadedMetadata = () => {
      if (activeEngineRef.current === 'html5') {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
        setIsBuffering(false);
      }
    };

    const handleReady = () => {
      if (activeEngineRef.current === 'html5') {
        setIsBuffering(false);
      }
    };

    const handleWaiting = () => {
      if (activeEngineRef.current === 'html5') {
        setIsBuffering(true);
      }
    };

    const handlePlaying = () => {
      if (activeEngineRef.current === 'html5') {
        setIsBuffering(false);
        setIsPlaying(true);
      }
    };

    const handlePause = () => {
      if (activeEngineRef.current === 'html5') {
        setIsBuffering(false);
        setIsPlaying(false);
      }
    };

    const handleEnded = () => {
      if (activeEngineRef.current === 'html5') {
        setIsBuffering(false);
        handleTrackEndRef.current();
      }
    };

    const handleError = () => {
      if (activeEngineRef.current === 'html5') {
        setIsBuffering(false);
        setIsPlaying(false);
        console.warn('Audio playback error for active track:', currentTrackRef.current?.title);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleReady);
    audio.addEventListener('canplay', handleReady);
    audio.addEventListener('canplaythrough', handleReady);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleReady);
      audio.removeEventListener('canplay', handleReady);
      audio.removeEventListener('canplaythrough', handleReady);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // Save current queue and history to local storage
  useEffect(() => {
    try {
      localStorage.setItem('resonance_queue', JSON.stringify(queue));
    } catch {}
  }, [queue]);

  useEffect(() => {
    try {
      localStorage.setItem('resonance_history', JSON.stringify(history.slice(0, 30)));
    } catch {}
  }, [history]);

  useEffect(() => {
    if (currentTrack) {
      try {
        localStorage.setItem('resonance_last_track', JSON.stringify(currentTrack));
      } catch {}
    }
  }, [currentTrack]);

  // Volume synchronization across both HTML5 Audio and YouTube Player
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    if (ytPlayerRef.current && isYtReadyRef.current) {
      try {
        if (isMuted) {
          ytPlayerRef.current.mute();
        } else {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(volume * 100);
        }
      } catch {}
    }
    localStorage.setItem('resonance_volume', volume.toString());
  }, [volume, isMuted]);

  // Active "Playing Now" real counting heartbeat loop
  useEffect(() => {
    if (!currentTrack || !isPlaying) {
      if (currentTrack) {
        const sid = getAnonymousSessionId();
        api.stopPlaybackHeartbeat(sid);
      }
      return;
    }

    const sid = getAnonymousSessionId();
    api.sendPlaybackHeartbeat(sid, currentTrack.id, true);

    const interval = setInterval(() => {
      api.sendPlaybackHeartbeat(sid, currentTrack.id, true);
    }, 20000);

    return () => {
      clearInterval(interval);
      api.stopPlaybackHeartbeat(sid);
    };
  }, [currentTrack?.id, isPlaying]);

  const recordTrackPlay = useCallback((track: Track) => {
    const sid = getAnonymousSessionId();
    api.recordPlay(track.id, sid);
  }, []);

  // Plays requested track in 100% full length with zero 29s preview cuts
  const playTrack = useCallback(
    async (track: Track, newQueue?: Track[]) => {
      const reqId = ++playRequestIdRef.current;
      setCurrentTrack(track);
      currentTrackRef.current = track;
      setDuration(track.duration || 210);
      setCurrentTime(0);
      setIsBuffering(true);

      recordTrackPlay(track);
      setHistory((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
      if (newQueue) {
        setQueue(newQueue.filter((t) => t.id !== track.id));
      }

      // 1. Direct YouTube track
      if (track.youtubeId) {
        activeEngineRef.current = 'youtube';
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }

        if (isYtReadyRef.current && ytPlayerRef.current) {
          try {
            if (typeof ytPlayerRef.current.loadVideoById === 'function') {
              ytPlayerRef.current.loadVideoById(track.youtubeId);
              ytPlayerRef.current.playVideo?.();
              ytPlayerRef.current.setVolume?.(isMuted ? 0 : volume * 100);
            } else {
              queuedVideoIdRef.current = track.youtubeId;
            }
          } catch (e) {
            console.warn('YouTube loadVideoById error:', e);
          }
        } else {
          queuedVideoIdRef.current = track.youtubeId;
        }
        return;
      }

      // 2. User uploaded track or local synth track
      if (track.audioUrl.startsWith('/uploads/') || track.audioUrl.startsWith('/api/audio/synth/')) {
        activeEngineRef.current = 'html5';
        try {
          ytPlayerRef.current?.pauseVideo?.();
        } catch {}

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = track.audioUrl;
          audioRef.current.currentTime = 0;
          audioRef.current.load();
          audioRef.current.play().catch((err) => {
            if (err.name !== 'AbortError' && playRequestIdRef.current === reqId) {
              setIsPlaying(false);
              setIsBuffering(false);
            }
          });
        }
        return;
      }

      // 3. Online song without videoId: resolve official full length videoId
      activeEngineRef.current = 'youtube';
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      try {
        const res = await api.resolveYouTube(track.title, track.artistName);
        if (playRequestIdRef.current !== reqId) return;

        if (res.videoId) {
          track.youtubeId = res.videoId;
          track.source = 'youtube';
          if (res.duration) {
            setDuration(res.duration);
            track.duration = res.duration;
          }

          if (isYtReadyRef.current && ytPlayerRef.current) {
            try {
              if (typeof ytPlayerRef.current.loadVideoById === 'function') {
                ytPlayerRef.current.loadVideoById(res.videoId);
                ytPlayerRef.current.playVideo?.();
                ytPlayerRef.current.setVolume?.(isMuted ? 0 : volume * 100);
              } else {
                queuedVideoIdRef.current = res.videoId;
              }
            } catch (e) {
              console.warn('YouTube loadVideoById error:', e);
            }
          } else {
            queuedVideoIdRef.current = res.videoId;
          }
          return;
        }
      } catch (err) {
        console.warn('Failed to resolve YouTube ID for track:', err);
      }

      // Fallback to HTML5 audio proxy if YouTube resolution failed
      if (playRequestIdRef.current === reqId && audioRef.current && track.audioUrl) {
        activeEngineRef.current = 'html5';
        audioRef.current.src = track.audioUrl;
        audioRef.current.currentTime = 0;
        audioRef.current.load();
        audioRef.current.play().catch(() => {});
      }
    },
    [recordTrackPlay, isMuted, volume]
  );

  const togglePlay = useCallback(() => {
    if (!currentTrack) {
      if (queue.length > 0) {
        playTrack(queue[0]);
      }
      return;
    }

    if (activeEngineRef.current === 'youtube' && ytPlayerRef.current && isYtReadyRef.current) {
      if (isPlaying) {
        try {
          if (typeof ytPlayerRef.current.pauseVideo === 'function') {
            ytPlayerRef.current.pauseVideo();
          }
        } catch {}
        setIsPlaying(false);
      } else {
        try {
          if (typeof ytPlayerRef.current.playVideo === 'function') {
            ytPlayerRef.current.playVideo();
          }
        } catch {}
        setIsPlaying(true);
      }
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => playTrack(currentTrack));
      }
    }
  }, [isPlaying, currentTrack, queue, playTrack]);

  const pause = useCallback(() => {
    if (activeEngineRef.current === 'youtube' && ytPlayerRef.current && isYtReadyRef.current) {
      try {
        if (typeof ytPlayerRef.current.pauseVideo === 'function') {
          ytPlayerRef.current.pauseVideo();
        }
      } catch {}
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setIsBuffering(false);
  }, []);

  const resume = useCallback(() => {
    if (activeEngineRef.current === 'youtube' && ytPlayerRef.current && isYtReadyRef.current) {
      try {
        if (typeof ytPlayerRef.current.playVideo === 'function') {
          ytPlayerRef.current.playVideo();
        }
      } catch {}
      return;
    }
    if (audioRef.current && currentTrack) {
      audioRef.current.play().catch(() => playTrack(currentTrack));
    }
  }, [currentTrack, playTrack]);

  const nextTrack = useCallback(() => {
    if (repeat === 'one' && currentTrack) {
      seek(0);
      resume();
      return;
    }

    if (queue.length > 0) {
      let nextIndex = 0;
      if (shuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }
      const nextSong = queue[nextIndex];
      const newQueue = queue.filter((_, idx) => idx !== nextIndex);
      setQueue(newQueue);
      playTrack(nextSong);
    } else if (repeat === 'all' && history.length > 0) {
      const reversed = [...history].reverse();
      playTrack(reversed[0], reversed.slice(1));
    } else {
      pause();
    }
  }, [queue, shuffle, repeat, currentTrack, history, playTrack, pause]);

  const prevTrack = useCallback(() => {
    if (currentTime > 3) {
      seek(0);
      return;
    }
    if (history.length > 1) {
      const previousSong = history[1];
      const newHistory = history.slice(1);
      setHistory(newHistory);
      if (currentTrack) {
        setQueue((q) => [currentTrack, ...q]);
      }
      playTrack(previousSong);
    } else {
      seek(0);
    }
  }, [currentTime, history, currentTrack, playTrack]);

  const seek = useCallback((timeInSeconds: number) => {
    setCurrentTime(timeInSeconds);
    if (activeEngineRef.current === 'youtube' && ytPlayerRef.current && isYtReadyRef.current) {
      try {
        if (typeof ytPlayerRef.current.seekTo === 'function') {
          ytPlayerRef.current.seekTo(timeInSeconds, true);
        }
      } catch {}
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = timeInSeconds;
    }
  }, []);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const toggleQueue = useCallback(() => {
    setIsQueueOpen((prev) => !prev);
  }, []);

  const toggleLyrics = useCallback(() => {
    setIsLyricsOpen((prev) => !prev);
  }, []);

  const toggleFullscreenPlayer = useCallback(() => {
    setIsFullscreenPlayer((prev) => !prev);
  }, []);

  const handleTrackEnd = useCallback(() => {
    if (repeat === 'one' && currentTrack) {
      seek(0);
      resume();
    } else {
      nextTrack();
    }
  }, [repeat, currentTrack, seek, resume, nextTrack]);

  useEffect(() => {
    handleTrackEndRef.current = handleTrackEnd;
  }, [handleTrackEnd]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isBuffering,
        currentTime,
        duration: duration || currentTrack?.duration || 0,
        volume,
        isMuted,
        shuffle,
        repeat,
        queue,
        history,
        isQueueOpen,
        isLyricsOpen,
        isFullscreenPlayer,
        playTrack,
        togglePlay,
        pause,
        resume,
        nextTrack,
        prevTrack,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        addToQueue,
        removeFromQueue,
        clearQueue,
        toggleQueue,
        toggleLyrics,
        toggleFullscreenPlayer,
        setIsLyricsOpen,
        setIsFullscreenPlayer
      }}
    >
      {children}
      {/* Hidden YouTube audio playback engine container */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '1px',
          height: '1px',
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: -999,
          overflow: 'hidden'
        }}
      >
        <div id="resonance-yt-engine" />
      </div>
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
