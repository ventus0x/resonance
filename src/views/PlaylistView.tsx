import React, { useEffect, useState } from 'react';
import { Play, Pause, Share2, Check } from 'lucide-react';
import type { Playlist, Track } from '../types';
import { api } from '../services/api';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { formatDuration } from '../utils/formatters';
import { TrackRow } from '../components/TrackRow';

interface PlaylistViewProps {
  playlistId: string;
  onNavigate: (view: string, params?: any) => void;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({ playlistId, onNavigate }) => {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();

  useEffect(() => {
    async function loadPlaylist() {
      setLoading(true);
      try {
        const res = await api.getPlaylistById(playlistId);
        setPlaylist(res.playlist);
        setTracks(res.tracks || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadPlaylist();
  }, [playlistId]);

  if (loading) {
    return <div className="py-24 text-center text-xs text-zinc-500">Loading playlist...</div>;
  }

  if (!playlist) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Playlist Not Found</h2>
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold"
        >
          Return Home
        </button>
      </div>
    );
  }

  const isPlaylistPlaying = tracks.some((t) => t.id === currentTrack?.id) && isPlaying;
  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  const handlePlayPlaylist = () => {
    if (tracks.length === 0) return;
    if (isPlaylistPlaying) {
      togglePlay();
    } else {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Playlist Header */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 rounded-3xl bg-gradient-to-b from-amber-500/15 via-[#101626] to-[#0a0d18] p-6 md:p-8 border border-white/10">
        <img
          src={playlist.coverUrl}
          alt={playlist.name}
          className="aspect-square w-48 md:w-56 rounded-2xl object-cover shadow-2xl shrink-0 border border-white/10"
        />

        <div className="flex-1 text-center md:text-left space-y-2.5">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
            Public Playlist
          </span>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">{playlist.name}</h1>

          <p className="text-xs md:text-sm text-zinc-300 max-w-xl">{playlist.description}</p>

          <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-zinc-400 font-mono">
            <span>Curated by {playlist.userName}</span>
            <span>•</span>
            <span>{tracks.length} tracks</span>
            <span>•</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3 pt-3">
            <button
              onClick={handlePlayPlaylist}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              {isPlaylistPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
              <span>{isPlaylistPlaying ? 'Pause' : 'Play Playlist'}</span>
            </button>

            <button
              onClick={handleShare}
              className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white transition"
              title="Share Playlist"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tracks */}
      <div>
        <div className="border-b border-white/10 pb-3 mb-2 px-3 flex justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          <span className="flex-1"># Title</span>
          <span className="hidden md:inline flex-1 px-4">Album</span>
          <span className="w-24 text-right">Time</span>
        </div>

        {tracks.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs rounded-2xl border border-dashed border-white/10">
            No tracks in this playlist yet.
          </div>
        ) : (
          <div className="space-y-1">
            {tracks.map((track, idx) => (
              <TrackRow
                key={`pl-track-${track.id}-${idx}`}
                track={track}
                index={idx}
                onNavigateTrack={(id) => onNavigate('track', { trackId: id })}
                onNavigateArtist={(id) => onNavigate('artist', { artistId: id })}
                allTracks={tracks}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
