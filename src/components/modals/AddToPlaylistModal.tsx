import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ListMusic, Plus, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Playlist } from '../../types';

export const AddToPlaylistModal: React.FC = () => {
  const { playlistModal, closePlaylistModal, user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (playlistModal.isOpen && user) {
      loadPlaylists();
    }
  }, [playlistModal.isOpen, user]);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const res = await api.getPlaylists();
      setPlaylists(res.playlists);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!playlistModal.isOpen || !playlistModal.trackId) return null;

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      await api.addTrackToPlaylist(playlistId, playlistModal.trackId!);
      setAddedIds((prev) => [...prev, playlistId]);
      setTimeout(() => {
        closePlaylistModal();
      }, 700);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateNewPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const res = await api.createPlaylist({
        name: newPlaylistName.trim(),
        tracks: [playlistModal.trackId!]
      });
      setPlaylists((prev) => [res.playlist, ...prev]);
      setAddedIds((prev) => [...prev, res.playlist.id]);
      setNewPlaylistName('');
      setIsCreating(false);
      setTimeout(() => {
        closePlaylistModal();
      }, 700);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0f1422] text-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div className="flex items-center gap-2">
              <ListMusic className="h-5 w-5 text-amber-400" />
              <h3 className="font-semibold text-white">Add to Playlist</h3>
            </div>
            <button
              onClick={closePlaylistModal}
              className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5">
            {!isCreating ? (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.03] py-2.5 text-xs font-medium text-amber-400 hover:bg-white/[0.06] transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                New Playlist
              </button>
            ) : (
              <form onSubmit={handleCreateNewPlaylist} className="mb-4 space-y-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Playlist title..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 rounded-lg bg-white/5 py-1.5 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-amber-500 py-1.5 text-xs font-semibold text-black hover:bg-amber-400"
                  >
                    Create & Add
                  </button>
                </div>
              </form>
            )}

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {loading ? (
                <div className="py-6 text-center text-xs text-zinc-500">Loading playlists...</div>
              ) : playlists.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">No playlists yet. Create one above!</div>
              ) : (
                playlists.map((pl, idx) => {
                  const isAdded = addedIds.includes(pl.id) || pl.tracks?.includes(playlistModal.trackId!);
                  return (
                    <button
                      key={`modal-pl-${pl.id}-${idx}`}
                      onClick={() => !isAdded && handleAddToPlaylist(pl.id)}
                      disabled={isAdded}
                      className="w-full flex items-center justify-between rounded-xl p-2 text-left hover:bg-white/5 transition group cursor-pointer disabled:cursor-default"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={pl.coverUrl}
                          alt={pl.name}
                          className="h-9 w-9 rounded-lg object-cover"
                        />
                        <div>
                          <div className="text-xs font-medium text-white group-hover:text-amber-400 transition">
                            {pl.name}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {pl.trackCount} tracks
                          </div>
                        </div>
                      </div>
                      {isAdded && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                          <Check className="h-3.5 w-3.5" /> Added
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
