import React, { useEffect, useState } from 'react';
import { Play, Sparkles, Flame, Users, Disc3, Radio, ArrowRight, Music2, Headphones } from 'lucide-react';
import type { Track, Artist, Playlist } from '../types';
import { api } from '../services/api';
import { TrackCard } from '../components/TrackCard';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useAuth } from '../context/AuthContext';

interface HomeViewProps {
  onNavigate: (view: string, params?: any) => void;
}

const GENRES = [
  'Electronic',
  'Lo-fi',
  'Indie',
  'R&B',
  'Classical',
  'Hip-Hop',
  'Rock',
  'Pop',
  'Jazz',
  'Metal',
  'Country'
];

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const { playTrack, history } = useAudioPlayer();
  const { user, openAuthModal } = useAuth();

  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [trendingRes, newRes, artistsRes, playlistsRes] = await Promise.all([
          api.getTrending(),
          api.getNewReleases(),
          api.getArtists(),
          api.getPlaylists()
        ]);
        setTrendingTracks(trendingRes.tracks || []);
        setNewReleases(newRes.tracks || []);
        setArtists(artistsRes.artists || []);
        setPlaylists(playlistsRes.playlists || []);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  const lastPlayedTrack = history.length > 0 ? history[0] : null;

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse py-6">
        <div className="h-64 rounded-3xl bg-white/[0.04] border border-white/5" />
        <div className="h-8 w-44 rounded-lg bg-white/[0.05]" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="aspect-[3/4] rounded-2xl bg-white/[0.03] border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#18233c] via-[#0e1526] to-[#090d18] p-8 md:p-14 shadow-2xl">
        {/* Ambient atmospheric glows */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-orange-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Open Music Discovery • Instant Free Streaming</span>
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-sans leading-tight">
            Music for <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">everyone.</span>
          </h1>

          <p className="text-sm md:text-base text-zinc-300 leading-relaxed max-w-xl">
            Discover independent artists, stream your favorite tracks, and share your music. No login required to listen.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (trendingTracks.length > 0) {
                  playTrack(trendingTracks[0], trendingTracks);
                } else {
                  onNavigate('discover');
                }
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/25 hover:from-amber-300 hover:to-orange-300 transition cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Explore Music</span>
            </button>

            <button
              onClick={() => {
                if (!user) {
                  openAuthModal('Sign in to publish your music as a Resonance Creator.');
                } else {
                  onNavigate('upload');
                }
              }}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition cursor-pointer"
            >
              <Music2 className="h-4 w-4 text-amber-400" />
              <span>Start Creating</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Personalized / Contextual Recommendation */}
      {lastPlayedTrack && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Because you listened to <span className="text-amber-400">{lastPlayedTrack.title}</span>
              </h3>
            </div>
            <button
              onClick={() => onNavigate('discover', { genre: lastPlayedTrack.genre })}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
            >
              More in {lastPlayedTrack.genre} <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {(trendingTracks.filter((t) => t.id !== lastPlayedTrack.id && t.genre === lastPlayedTrack.genre).length > 0
              ? trendingTracks.filter((t) => t.id !== lastPlayedTrack.id && t.genre === lastPlayedTrack.genre)
              : trendingTracks.filter((t) => t.id !== lastPlayedTrack.id)
            )
              .slice(0, 5)
              .map((track, idx) => (
                <TrackCard
                  key={`home-rec-${track.id}-${idx}`}
                  track={track}
                  onNavigateTrack={(id) => onNavigate('track', { trackId: id })}
                  onNavigateArtist={(id) => onNavigate('artist', { artistId: id })}
                  allTracks={trendingTracks}
                />
              ))}
          </div>
        </section>
      )}

      {/* 3. Trending Tracks Carousel */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Trending Tracks</h2>
          </div>
          <button
            onClick={() => onNavigate('discover')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {trendingTracks.slice(0, 5).map((track, idx) => (
            <TrackCard
              key={`home-trending-${track.id}-${idx}`}
              track={track}
              onNavigateTrack={(id) => onNavigate('track', { trackId: id })}
              onNavigateArtist={(id) => onNavigate('artist', { artistId: id })}
              allTracks={trendingTracks}
            />
          ))}
        </div>
      </section>

      {/* 4. Popular Artists */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Popular Artists</h2>
          </div>
          <button
            onClick={() => onNavigate('discover')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            Explore all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {artists.map((artist, idx) => (
            <div
              key={`home-artist-${artist.id}-${idx}`}
              onClick={() => onNavigate('artist', { artistId: artist.id })}
              className="group flex flex-col items-center text-center p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition cursor-pointer"
            >
              <div className="relative mb-3 aspect-square w-24 md:w-28 rounded-full overflow-hidden shadow-lg group-hover:scale-105 transition duration-300">
                <img
                  src={artist.avatar}
                  alt={artist.artistName}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  <Play className="h-6 w-6 fill-white text-white" />
                </div>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition truncate w-full">
                {artist.artistName}
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">{artist.genre}</p>
              <span className="mt-2 text-[10px] text-zinc-500 font-mono">
                {(artist.monthlyListeners ?? 0).toLocaleString()} monthly
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. New Releases */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Disc3 className="h-5 w-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">New Releases</h2>
          </div>
          <button
            onClick={() => onNavigate('discover')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {newReleases.slice(0, 5).map((track, idx) => (
            <TrackCard
              key={`home-release-${track.id}-${idx}`}
              track={track}
              onNavigateTrack={(id) => onNavigate('track', { trackId: id })}
              onNavigateArtist={(id) => onNavigate('artist', { artistId: id })}
              allTracks={newReleases}
            />
          ))}
        </div>
      </section>

      {/* 6. Featured Playlists */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Curated Playlists</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {playlists.map((playlist, idx) => (
            <div
              key={`home-playlist-${playlist.id}-${idx}`}
              onClick={() => onNavigate('playlist', { playlistId: playlist.id })}
              className="group flex items-center gap-4 rounded-2xl bg-white/[0.03] p-3.5 border border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition cursor-pointer"
            >
              <img
                src={playlist.coverUrl}
                alt={playlist.name}
                className="h-20 w-20 rounded-xl object-cover shrink-0 shadow-md group-hover:scale-105 transition"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition line-clamp-1">
                  {playlist.name}
                </h4>
                <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                  {playlist.description}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-500 font-medium">
                  <span>{playlist.trackCount} tracks</span>
                  <span>•</span>
                  <span>By {playlist.userName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Browse by Genre */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Browse by Genre</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Explore soundscapes across categories</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => onNavigate('discover', { genre })}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300 transition cursor-pointer"
            >
              {genre}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
