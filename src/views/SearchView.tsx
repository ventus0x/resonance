import React, { useState, useEffect } from 'react';
import { Search, Disc3, Play } from 'lucide-react';
import type { SearchResults } from '../types';
import { api } from '../services/api';
import { TrackRow } from '../components/TrackRow';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface SearchViewProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (view: string, params?: any) => void;
}

const CATEGORIES = ['All', 'Tracks', 'Artists', 'Albums', 'Playlists'];

export const SearchView: React.FC<SearchViewProps> = ({
  searchQuery,
  onSearchChange,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState('All');
  const [results, setResults] = useState<SearchResults>({
    tracks: [],
    artists: [],
    albums: [],
    playlists: []
  });
  const [loading, setLoading] = useState(false);
  const { playTrack } = useAudioPlayer();

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({ tracks: [], artists: [], albums: [], playlists: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(searchQuery.trim());
        setResults(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const topTrack = results.tracks.length > 0 ? results.tracks[0] : null;

  return (
    <div className="space-y-6 pb-16">
      {/* Search Input on mobile/page header */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
        <input
          type="text"
          autoFocus
          placeholder="Search by track title, artist, album name, or genre..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 py-3.5 text-sm md:text-base text-white placeholder-zinc-500 focus:border-amber-400 focus:bg-white/10 focus:outline-none transition shadow-inner"
        />
      </div>

      {/* Category Tabs */}
      {searchQuery.trim() && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === tab
                  ? 'bg-amber-400 text-black shadow'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* No Query State: Explore Suggestions */}
      {!searchQuery.trim() ? (
        <div className="space-y-8 pt-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-6">
            <h3 className="text-lg font-bold text-white mb-1">Instant Music Search</h3>
            <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
              No account required. Type any keyword, artist, or genre to immediately stream original tracks and explore catalog discographies.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">
              Quick Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {['The Weeknd', 'Taylor Swift', 'Billie Eilish', 'Kendrick Lamar', 'Dua Lipa', 'Coldplay', 'Elena Vance', 'Lo-fi Beats', 'Synthwave', 'Indie Rock'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => onSearchChange(tag)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-zinc-300 hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300 transition cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="py-20 text-center text-xs text-zinc-500">Searching resonance catalog...</div>
      ) : (
        <div className="space-y-8">
          {/* Top Result & Top Tracks Split (when 'All') */}
          {activeTab === 'All' && topTrack && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Result Card */}
              <div className="lg:col-span-1 rounded-2xl bg-white/[0.03] border border-white/10 p-6 flex flex-col justify-between group hover:border-white/20 transition">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Top Result
                  </span>
                  <div className="mt-4 flex flex-col items-center text-center">
                    <img
                      src={topTrack.coverUrl}
                      alt={topTrack.title}
                      className="h-32 w-32 rounded-2xl object-cover shadow-2xl mb-4 group-hover:scale-105 transition"
                    />
                    <h3 className="text-xl font-extrabold text-white line-clamp-1">{topTrack.title}</h3>
                    <p
                      onClick={() => onNavigate('artist', { artistId: topTrack.artistId })}
                      className="text-xs text-zinc-400 hover:text-amber-300 transition cursor-pointer mt-1"
                    >
                      {topTrack.artistName} • <span className="uppercase text-[10px] bg-white/5 px-1.5 py-0.5 rounded">{topTrack.genre}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={() => playTrack(topTrack, results.tracks)}
                    className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 transition cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Play Song
                  </button>
                  <button
                    onClick={() => onNavigate('track', { trackId: topTrack.id })}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    View Track
                  </button>
                </div>
              </div>

              {/* Tracks List preview */}
              <div className="lg:col-span-2 space-y-2">
                <h3 className="text-sm font-bold text-white mb-2">Matching Tracks</h3>
                {results.tracks.slice(0, 5).map((track, idx) => (
                  <TrackRow
                    key={`search-preview-${track.id}-${idx}`}
                    track={track}
                    index={idx}
                    onNavigateTrack={(id) => onNavigate('track', { trackId: id })}
                    onNavigateArtist={(id) => onNavigate('artist', { artistId: id })}
                    allTracks={results.tracks}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Full Tracks List (if tab is 'Tracks' or if 'All') */}
          {(activeTab === 'Tracks' || (activeTab === 'All' && results.tracks.length > 5)) && (
            <div>
              <h3 className="text-sm font-bold text-white mb-3">Songs ({results.tracks.length})</h3>
              <div className="space-y-1">
                {results.tracks.map((track, idx) => (
                  <TrackRow
                    key={`search-full-${track.id}-${idx}`}
                    track={track}
                    index={idx}
                    onNavigateTrack={(id) => onNavigate('track', { trackId: id })}
                    onNavigateArtist={(id) => onNavigate('artist', { artistId: id })}
                    allTracks={results.tracks}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Artists */}
          {(activeTab === 'All' || activeTab === 'Artists') && results.artists.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white mb-3">Artists ({results.artists.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.artists.map((art, idx) => (
                  <div
                    key={`search-art-${art.id}-${idx}`}
                    onClick={() => onNavigate('artist', { artistId: art.id })}
                    className="group flex flex-col items-center text-center p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition cursor-pointer"
                  >
                    <img
                      src={art.avatar}
                      alt={art.artistName}
                      className="aspect-square w-24 rounded-full object-cover mb-3 group-hover:scale-105 transition"
                    />
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition truncate w-full">
                      {art.artistName}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">{art.genre}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Albums */}
          {(activeTab === 'All' || activeTab === 'Albums') && results.albums.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white mb-3">Albums ({results.albums.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {results.albums.map((alb, idx) => (
                  <div
                    key={`search-alb-${alb.id}-${idx}`}
                    onClick={() => onNavigate('album', { albumId: alb.id })}
                    className="group rounded-2xl bg-white/[0.03] border border-white/5 p-3 hover:border-white/15 hover:bg-white/[0.06] transition cursor-pointer"
                  >
                    <img
                      src={alb.coverUrl}
                      alt={alb.title}
                      className="aspect-square w-full rounded-xl object-cover mb-2 group-hover:scale-105 transition"
                    />
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-300">
                      {alb.title}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate">{alb.artistName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playlists */}
          {(activeTab === 'All' || activeTab === 'Playlists') && results.playlists.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white mb-3">Playlists ({results.playlists.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {results.playlists.map((pl, idx) => (
                  <div
                    key={`search-pl-${pl.id}-${idx}`}
                    onClick={() => onNavigate('playlist', { playlistId: pl.id })}
                    className="group flex items-center gap-3.5 rounded-2xl bg-white/[0.03] border border-white/5 p-3 hover:border-white/15 hover:bg-white/[0.06] transition cursor-pointer"
                  >
                    <img
                      src={pl.coverUrl}
                      alt={pl.name}
                      className="h-16 w-16 rounded-xl object-cover shrink-0 group-hover:scale-105 transition"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-300">
                        {pl.name}
                      </h4>
                      <p className="text-xs text-zinc-400 line-clamp-1">{pl.description}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{pl.trackCount} tracks</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty Results */}
          {results.tracks.length === 0 &&
            results.artists.length === 0 &&
            results.albums.length === 0 &&
            results.playlists.length === 0 && (
              <div className="py-20 text-center rounded-2xl border border-dashed border-white/10 text-zinc-400">
                <Disc3 className="h-10 w-10 mx-auto mb-2 text-zinc-600" />
                <p className="text-base font-semibold text-white">No results found for "{searchQuery}"</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Try searching for artist names like "Elena Vance", "Neon Mirage", or genres like "Lo-fi".
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
};
