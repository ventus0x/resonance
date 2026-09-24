import React, { useEffect, useState } from 'react';
import { Play, UserPlus, UserCheck, Share2, Check } from 'lucide-react';
import type { Artist, Track, Album } from '../types';
import { api } from '../services/api';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useAuth } from '../context/AuthContext';
import { TrackRow } from '../components/TrackRow';

interface ArtistViewProps {
  artistId: string;
  onNavigate: (view: string, params?: any) => void;
}

export const ArtistView: React.FC<ArtistViewProps> = ({ artistId, onNavigate }) => {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'popular' | 'albums' | 'about'>('popular');

  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    async function loadArtist() {
      setLoading(true);
      try {
        const res = await api.getArtistById(artistId);
        setArtist(res.artist);
        setTracks(res.tracks || []);
        setAlbums(res.albums || []);
        setFollowerCount(res.artist?.followerCount || 0);

        if (user) {
          try {
            const followStatus = await api.checkFollowStatus(artistId);
            setIsFollowing(followStatus.isFollowing);
          } catch {}
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadArtist();
  }, [artistId, user]);

  const handleFollowToggle = async () => {
    if (!user) {
      openAuthModal('Sign in to follow artists and get updates on new releases.');
      return;
    }
    try {
      const res = await api.toggleFollowArtist(artistId);
      setIsFollowing(res.isFollowing);
      setFollowerCount((prev) => (res.isFollowing ? prev + 1 : Math.max(0, prev - 1)));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlayArtist = () => {
    if (tracks.length === 0) return;
    const isFirstTrackPlaying = currentTrack?.id === tracks[0].id && isPlaying;
    if (isFirstTrackPlaying) {
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

  if (loading) {
    return <div className="py-24 text-center text-xs text-zinc-500">Loading artist profile...</div>;
  }

  if (!artist) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Artist Not Found</h2>
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Banner & Bio */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-amber-500/20 via-[#10172a] to-[#0a0d18] p-6 md:p-10 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
          <div className="relative aspect-square w-40 md:w-52 rounded-full overflow-hidden shadow-2xl shrink-0 border-2 border-white/20">
            <img src={artist.avatar} alt={artist.artistName} className="h-full w-full object-cover" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Verified Artist
              </span>
              <span className="text-xs text-zinc-400 font-medium">{artist.genre}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              {artist.artistName}
            </h1>

            <p className="text-xs md:text-sm text-zinc-300 max-w-xl leading-relaxed">
              {artist.bio}
            </p>

            <div className="flex items-center justify-center md:justify-start gap-4 text-xs font-mono text-zinc-400 pt-1">
              <span>{(artist.monthlyListeners ?? 0).toLocaleString()} monthly listeners</span>
              <span>•</span>
              <span>{(followerCount ?? 0).toLocaleString()} followers</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 pt-3">
              <button
                onClick={handlePlayArtist}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Play Discography</span>
              </button>

              <button
                onClick={handleFollowToggle}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold border transition cursor-pointer ${
                  isFollowing
                    ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                    : 'border-white/20 bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                <span>{isFollowing ? 'Following' : 'Follow'}</span>
              </button>

              <button
                onClick={handleShare}
                className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white transition"
                title="Share Profile"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('popular')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'popular' ? 'border-amber-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Popular Tracks
        </button>
        <button
          onClick={() => setActiveTab('albums')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'albums' ? 'border-amber-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Albums & EPs ({albums.length})
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'about' ? 'border-amber-400 text-white' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          About
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'popular' && (
        <div className="space-y-2">
          {tracks.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">No tracks published yet.</div>
          ) : (
            tracks.map((track, idx) => (
              <TrackRow
                key={`art-track-${track.id}-${idx}`}
                track={track}
                index={idx}
                onNavigateTrack={(id) => onNavigate('track', { trackId: id })}
                onNavigateArtist={(id) => onNavigate('artist', { artistId: id })}
                allTracks={tracks}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'albums' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {albums.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-zinc-500">
              No albums released yet.
            </div>
          ) : (
            albums.map((alb, idx) => (
              <div
                key={`art-alb-${alb.id}-${idx}`}
                onClick={() => onNavigate('album', { albumId: alb.id })}
                className="group flex gap-4 rounded-2xl bg-white/[0.03] p-4 border border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition cursor-pointer"
              >
                <img
                  src={alb.coverUrl}
                  alt={alb.title}
                  className="h-24 w-24 rounded-xl object-cover shadow-lg group-hover:scale-105 transition"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">{alb.releaseYear}</span>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition truncate mt-0.5">
                    {alb.title}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{alb.description}</p>
                  <p className="text-[11px] text-zinc-500 mt-2">{alb.trackCount} tracks</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 max-w-2xl space-y-4">
          <h3 className="text-lg font-bold text-white">Artist Biography</h3>
          <p className="text-sm text-zinc-300 leading-relaxed">{artist.bio}</p>
          <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-zinc-500 block">Primary Genre</span>
              <span className="text-white font-semibold">{artist.genre}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Joined Platform</span>
              <span className="text-white font-semibold">2026</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
