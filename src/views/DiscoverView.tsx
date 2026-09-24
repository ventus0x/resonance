import React, { useEffect, useState } from 'react';
import { Compass, Filter, Play } from 'lucide-react';
import type { Track, Album, Playlist } from '../types';
import { api } from '../services/api';
import { TrackCard } from '../components/TrackCard';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface DiscoverViewProps {
  initialGenre?: string;
  onNavigate: (view: string, params?: any) => void;
}

const GENRES = ['All', 'Electronic', 'Lo-fi', 'Indie', 'R&B', 'Classical', 'Hip-Hop', 'Rock', 'Pop'];

const MOODS = [
  { name: 'Night Drive', genre: 'Electronic', color: 'from-purple-900/60 to-indigo-950/80', desc: 'Neon rhythms & synth highways' },
  { name: 'Deep Focus', genre: 'Lo-fi', color: 'from-amber-950/60 to-stone-900/80', desc: 'Rainy coffeehouse beat tape' },
  { name: 'Golden Indie', genre: 'Indie', color: 'from-orange-950/60 to-amber-900/80', desc: 'Sunsets & breezy coastal strums' },
  { name: 'Velvet Soul', genre: 'R&B', color: 'from-rose-950/60 to-pink-900/80', desc: 'Midnight harmonies & warm bass' }
];

export const DiscoverView: React.FC<DiscoverViewProps> = ({ initialGenre, onNavigate }) => {
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre || 'All');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useAudioPlayer();

  useEffect(() => {
    if (initialGenre) {
      setSelectedGenre(initialGenre);
    }
  }, [initialGenre]);

  useEffect(() => {
    async function loadDiscoverData() {
      setLoading(true);
      try {
        const [trackRes, albRes, plRes] = await Promise.all([
          api.getTracks({ genre: selectedGenre === 'All' ? undefined : selectedGenre }),
          api.getAlbums(),
          api.getPlaylists()
        ]);
        setTracks(trackRes.tracks || []);
        setAlbums(albRes.albums || []);
        setPlaylists(plRes.playlists || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadDiscoverData();
  }, [selectedGenre]);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <Compass className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Sound Discovery</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Explore Genres & Moods
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Stream open independent music across electronic, ambient, indie, and neo-soul landscapes.
        </p>
      </div>

      {/* Mood Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOODS.map((mood) => (
          <div
            key={mood.name}
            onClick={() => setSelectedGenre(mood.genre)}
            className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${mood.color} p-5 cursor-pointer hover:border-amber-400/40 transition duration-300`}
          >
            <div className="relative z-10">
              <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
                {mood.genre}
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5 group-hover:text-amber-200 transition">
                {mood.name}
              </h3>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{mood.desc}</p>
            </div>
            <div className="absolute right-3 bottom-3 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition group-hover:scale-105">
              <Play className="h-4 w-4 fill-white text-white ml-0.5" />
            </div>
          </div>
        ))}
      </div>

      {/* Genre Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="h-4 w-4 text-zinc-500 shrink-0 ml-1 mr-1" />
        {GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedGenre === genre
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Track Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            {selectedGenre === 'All' ? 'All Curated Tracks' : `${selectedGenre} Music`} ({tracks.length})
          </h2>
          {tracks.length > 0 && (
            <button
              onClick={() => playTrack(tracks[0], tracks)}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Play All
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-zinc-500 text-xs">Loading sound catalog...</div>
        ) : tracks.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs rounded-2xl border border-dashed border-white/10">
            No tracks found in {selectedGenre}. Try another genre or upload your own track!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tracks.map((track, idx) => (
              <TrackCard
                key={`disc-track-${track.id}-${idx}`}
                track={track}
                onNavigateTrack={(id) => onNavigate('track', { trackId: id })}
                onNavigateArtist={(id) => onNavigate('artist', { artistId: id })}
                allTracks={tracks}
              />
            ))}
          </div>
        )}
      </div>

      {/* Matching Albums */}
      {albums.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Featured Albums</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {albums.map((alb, idx) => (
              <div
                key={`disc-alb-${alb.id}-${idx}`}
                onClick={() => onNavigate('album', { albumId: alb.id })}
                className="group flex gap-3.5 rounded-2xl bg-white/[0.03] p-3.5 border border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition cursor-pointer"
              >
                <img
                  src={alb.coverUrl}
                  alt={alb.title}
                  className="h-20 w-20 rounded-xl object-cover shadow-md group-hover:scale-105 transition"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-amber-400 uppercase">{alb.genre}</span>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition truncate mt-0.5">
                    {alb.title}
                  </h4>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{alb.artistName}</p>
                  <p className="text-[10px] text-zinc-500 mt-2">{alb.trackCount} tracks</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matching Curated Playlists */}
      {playlists.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Curated Playlists</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {playlists.map((pl, idx) => (
              <div
                key={`disc-pl-${pl.id}-${idx}`}
                onClick={() => onNavigate('playlist', { playlistId: pl.id })}
                className="group flex gap-3.5 rounded-2xl bg-white/[0.03] p-3.5 border border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition cursor-pointer"
              >
                <img
                  src={pl.coverUrl}
                  alt={pl.name}
                  className="h-20 w-20 rounded-xl object-cover shadow-md group-hover:scale-105 transition"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition truncate">
                    {pl.name}
                  </h4>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                    {pl.description}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-2 font-medium">
                    {pl.trackCount} tracks • By {pl.userName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
