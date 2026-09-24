import React, { useState, useEffect } from 'react';
import { Heart, Clock, ListMusic, Plus, Sparkles, Play } from 'lucide-react';
import type { Track, Playlist } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { TrackRow } from '../components/TrackRow';

interface LibraryViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onNavigate }) => {
  const { user, likedTrackIds, openAuthModal } = useAuth();
  const { history, playTrack } = useAudioPlayer();
  const [activeTab, setActiveTab] = useState<'likes' | 'history' | 'playlists'>('likes');

  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPl, setIsCreatingPl] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch liked tracks based on likedTrackIds
  useEffect(() => {
    async function loadLibraryData() {
      setLoading(true);
      try {
        const allTracksRes = await api.getTracks();
        const liked = allTracksRes.tracks.filter((t) => (likedTrackIds || []).includes(t.id));
        setLikedTracks(liked);

        const plRes = await api.getPlaylists();
        setPlaylists(plRes.playlists);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLibraryData();
  }, [likedTrackIds]);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    if (!user) {
      openAuthModal('Sign in to create persistent personal playlists.');
      return;
    }
    try {
      const res = await api.createPlaylist({ name: newPlaylistName.trim() });
      setPlaylists((prev) => [res.playlist, ...prev]);
      setNewPlaylistName('');
      setIsCreatingPl(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Library</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {user ? `Welcome back, ${user.username}.` : 'Listening anonymously. All likes and history are preserved locally.'}
          </p>
        </div>

        {!user && (
          <button
            onClick={() => openAuthModal('Sign in to backup your library and access your playlists anywhere.')}
            className="flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/30 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition self-start cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Sign in to sync</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('likes')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'likes' ? 'border-amber-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Heart className="h-4 w-4 text-rose-400" />
          <span>Liked Songs ({likedTracks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'history' ? 'border-amber-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Clock className="h-4 w-4 text-amber-400" />
          <span>Listening History ({history.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('playlists')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'playlists' ? 'border-amber-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <ListMusic className="h-4 w-4 text-indigo-400" />
          <span>Playlists ({playlists.length})</span>
        </button>
      </div>

      {/* Tab: Liked Tracks */}
      {activeTab === 'likes' && (
        <div className="space-y-4">
          {likedTracks.length > 0 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => playTrack(likedTracks[0], likedTracks)}
                className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-black hover:bg-amber-300 transition"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Play All Liked Songs
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-xs text-zinc-500">Loading your favorites...</div>
          ) : likedTracks.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 text-zinc-400">
              <Heart className="h-10 w-10 mx-auto mb-2 text-zinc-600" />
              <p className="text-sm font-semibold text-white">No liked songs yet</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Tap the heart icon on any song while streaming to save it to your local favorites.
              </p>
              <button
                onClick={() => onNavigate('discover')}
                className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15"
              >
                Browse Tracks
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {likedTracks.map((track, idx) => (
                <TrackRow
                  key={`liked-track-${track.id}-${idx}`}
                  track={track}
                  index={idx}
                  onNavigateTrack={(id) => onNavigate('track', { trackId: id })}
                  onNavigateArtist={(id) => onNavigate('artist', { artistId: id })}
                  allTracks={likedTracks}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Listening History */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 text-zinc-400">
              <Clock className="h-10 w-10 mx-auto mb-2 text-zinc-600" />
              <p className="text-sm font-semibold text-white">No play history recorded yet</p>
              <p className="text-xs text-zinc-500 mt-1">Start playing music to build your recent history.</p>
            </div>
          ) : (
            history.map((track, idx) => (
              <TrackRow
                key={`history-track-${track.id}-${idx}`}
                track={track}
                index={idx}
                onNavigateTrack={(id) => onNavigate('track', { trackId: id })}
                onNavigateArtist={(id) => onNavigate('artist', { artistId: id })}
                allTracks={history}
              />
            ))
          )}
        </div>
      )}

      {/* Tab: Playlists */}
      {activeTab === 'playlists' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Your Curated Playlists</h3>
            {!isCreatingPl ? (
              <button
                onClick={() => setIsCreatingPl(true)}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
              >
                <Plus className="h-3.5 w-3.5" />
                New Playlist
              </button>
            ) : null}
          </div>

          {isCreatingPl && (
            <form onSubmit={handleCreatePlaylist} className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-3 max-w-md">
              <h4 className="text-xs font-bold text-white">Create a New Playlist</h4>
              <input
                type="text"
                autoFocus
                placeholder="Playlist name (e.g. Chill Synthwave 2026)"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreatingPl(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {playlists.map((pl, idx) => (
              <div
                key={`lib-pl-${pl.id}-${idx}`}
                onClick={() => onNavigate('playlist', { playlistId: pl.id })}
                className="group flex gap-3.5 rounded-2xl bg-white/[0.03] p-3.5 border border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition cursor-pointer"
              >
                <img
                  src={pl.coverUrl}
                  alt={pl.name}
                  className="h-20 w-20 rounded-xl object-cover shadow-md group-hover:scale-105 transition shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition truncate">
                    {pl.name}
                  </h4>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{pl.description}</p>
                  <p className="text-[10px] text-zinc-500 mt-2">{pl.trackCount} tracks</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
