import type { Request, Response } from 'express';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import CryptoJS from 'crypto-js';
import type { Track, Artist, Album, SearchResults } from '../src/types.ts';
import { db } from './db.ts';

// Cache for external tracks, artists, and albums
const trackCache = new Map<string, Track>();
const artistCache = new Map<string, Artist>();
const albumCache = new Map<string, Album>();
const fullAudioUrlCache = new Map<string, string>();
const youtubeIdCache = new Map<string, string>();

function decodeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function generateWaveform(): number[] {
  const points: number[] = [];
  for (let i = 0; i < 48; i++) {
    const v = Math.sin(i * 0.25) * 0.4 + 0.5 + (Math.random() * 0.3 - 0.15);
    points.push(Math.round(Math.max(0.1, Math.min(1.0, v)) * 100) / 100);
  }
  return points;
}

// Rapid resolution of official YouTube video ID for any song
async function resolveYouTubeVideoId(title: string, artist = '', fallback?: string): Promise<{ videoId: string | null; duration: number }> {
  const cleanTitle = title.replace(/\(Official.*?\)|\[Official.*?\]/gi, '').trim();
  const cleanArtist = artist.trim();
  const cacheKey = `${cleanTitle.toLowerCase()}|||${cleanArtist.toLowerCase()}|||${fallback || 'default'}`;

  if (youtubeIdCache.has(cacheKey)) {
    return { videoId: youtubeIdCache.get(cacheKey)!, duration: 210 };
  }

  const queryTerms = fallback
    ? `${cleanTitle} ${cleanArtist} ${fallback}`
    : `${cleanArtist} ${cleanTitle} official audio`;

  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(queryTerms)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await res.text();
    const jsonMatch = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      for (const section of contents) {
        const items = section.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const v = item.videoRenderer;
          if (v?.videoId) {
            const lengthText = v.lengthText?.simpleText || '';
            const parts = lengthText.split(':').map(Number);
            let duration = 210;
            if (parts.length === 2) duration = parts[0] * 60 + parts[1];
            else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];

            youtubeIdCache.set(cacheKey, v.videoId);
            return { videoId: v.videoId, duration };
          }
        }
      }
    }

    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (match && match[1]) {
      youtubeIdCache.set(cacheKey, match[1]);
      return { videoId: match[1], duration: 210 };
    }
  } catch (err) {
    console.warn('Error resolving YouTube ID for track:', title, err);
  }

  return { videoId: null, duration: 210 };
}

// Search YouTube directly to provide real, full-length songs matching user queries
async function searchYouTube(query: string): Promise<Track[]> {
  const tracks: Track[] = [];
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await res.text();
    const jsonMatch = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      for (const section of contents) {
        const items = section.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const v = item.videoRenderer;
          if (!v?.videoId) continue;
          const rawTitle = v.title?.runs?.[0]?.text || 'Untitled';
          const cleanTitle = rawTitle.replace(/\(Official.*?\)|\[Official.*?\]|Official Video|Audio|Lyric Video/gi, '').trim();
          const artistName = v.ownerText?.runs?.[0]?.text || 'Artist';
          const lengthText = v.lengthText?.simpleText || '';
          const parts = lengthText.split(':').map(Number);
          let duration = 210;
          if (parts.length === 2) duration = parts[0] * 60 + parts[1];
          else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];

          // Skip extremely short snippets (< 35s) or long mixes (> 15 mins) unless specifically requested
          if (duration < 35 || duration > 1200) continue;

          const thumb = v.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
          const trackId = `yt_${v.videoId}`;
          const artistId = `yt_art_${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '_'))}`;

          const track: Track = {
            id: trackId,
            youtubeId: v.videoId,
            source: 'youtube',
            title: cleanTitle || rawTitle,
            artistId,
            artistName,
            audioUrl: `/api/stream?videoId=${v.videoId}&title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(artistName)}`,
            coverUrl: thumb,
            duration,
            genre: 'Popular',
            description: `${rawTitle} performed by ${artistName}`,
            lyrics: `[Full length official music track: ${cleanTitle} - ${artistName}]`,
            playCount: 120000 + Math.floor(Math.random() * 50000),
            likesCount: 9500 + Math.floor(Math.random() * 4000),
            releaseDate: new Date().getFullYear().toString(),
            status: 'published',
            waveform: generateWaveform(),
            createdAt: new Date().toISOString()
          };

          trackCache.set(trackId, track);

          // Cache artist
          if (!artistCache.has(artistId)) {
            artistCache.set(artistId, {
              id: artistId,
              artistName,
              bio: `Official music profile for ${artistName}.`,
              avatar: thumb,
              banner: thumb,
              genre: 'Popular',
              monthlyListeners: 850000,
              verified: true,
              createdAt: new Date().toISOString()
            });
          }

          tracks.push(track);
          if (tracks.length >= 12) break;
        }
        if (tracks.length >= 12) break;
      }
    }
  } catch (err) {
    console.warn('searchYouTube error:', err);
  }
  return tracks;
}

// Decrypt 320kbps full track audio URL from JioSaavn encrypted_media_url
function decryptMediaUrl(encUrl: string): string | null {
  if (!encUrl) return null;
  try {
    const key = CryptoJS.enc.Utf8.parse('38346591');
    const decrypted = CryptoJS.DES.decrypt(
      encUrl,
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    ).toString(CryptoJS.enc.Utf8);

    if (!decrypted || !decrypted.startsWith('http')) return null;

    // Prefer high quality 320kbps full track
    return decrypted.replace(/_96\.mp4$/, '_320.mp4');
  } catch {
    return null;
  }
}

// Format Saavn track to standard Track interface
function formatSaavnSong(song: any): Track {
  const trackId = `saavn_${song.id}`;
  const title = decodeHtml(song.title || 'Untitled Track');
  const artistName = decodeHtml(
    song.more_info?.artistMap?.primary_artists?.[0]?.name ||
    song.subtitle ||
    song.more_info?.music ||
    'Unknown Artist'
  );
  const artistId = `saavn_art_${song.more_info?.artistMap?.primary_artists?.[0]?.id || song.id}`;
  const albumId = song.more_info?.album_id ? `saavn_alb_${song.more_info.album_id}` : undefined;
  const albumTitle = decodeHtml(song.more_info?.album || song.title);

  // High-res album cover
  const rawImage = song.image || '';
  const coverUrl = rawImage
    ? rawImage.replace(/150x150\.(jpg|png|jpeg)/, '500x500.$1').replace(/50x50\.(jpg|png|jpeg)/, '500x500.$1')
    : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';

  // Duration in seconds (Full track length: typically 180s - 360s)
  const duration = parseInt(song.more_info?.duration, 10) || 210;

  // Decrypt and cache full audio URL if available
  if (song.more_info?.encrypted_media_url) {
    const decryptedUrl = decryptMediaUrl(song.more_info.encrypted_media_url);
    if (decryptedUrl) {
      fullAudioUrlCache.set(trackId, decryptedUrl);
    }
  }

  const track: Track = {
    id: trackId,
    title,
    artistId,
    artistName,
    albumId,
    albumTitle,
    // Stream endpoint providing the full audio stream
    audioUrl: `/api/stream?id=${trackId}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artistName)}`,
    coverUrl,
    duration,
    genre: song.language ? song.language.charAt(0).toUpperCase() + song.language.slice(1) : 'Music',
    description: `${title} performed by ${artistName}${albumTitle ? ` • ${albumTitle}` : ''}`,
    lyrics: `[Full length music track: ${title} - ${artistName}]`,
    playCount: parseInt(song.play_count, 10) || 68500,
    likesCount: Math.floor((parseInt(song.play_count, 10) || 68500) / 14),
    releaseDate: song.year || new Date().getFullYear().toString(),
    status: 'published',
    isExplicit: song.explicit_content === '1',
    waveform: generateWaveform(),
    createdAt: new Date().toISOString()
  };

  trackCache.set(trackId, track);

  // Cache artist
  const artist: Artist = {
    id: artistId,
    artistName,
    bio: `Artist profile for ${artistName}.`,
    avatar: coverUrl,
    banner: coverUrl,
    genre: track.genre,
    monthlyListeners: 150000,
    verified: true,
    createdAt: new Date().toISOString()
  };
  artistCache.set(artistId, artist);

  // Cache album
  if (albumId) {
    const album: Album = {
      id: albumId,
      artistId,
      artistName,
      title: albumTitle,
      description: `Album release by ${artistName}.`,
      coverUrl,
      releaseDate: song.year || new Date().getFullYear().toString(),
      genre: track.genre,
      trackCount: 1,
      duration
    };
    albumCache.set(albumId, album);
  }

  return track;
}

// Convert Deezer track item to standard Track interface
function formatDeezerTrack(dTrack: any): Track {
  const trackId = `deezer_${dTrack.id}`;
  const artistId = `deezer_art_${dTrack.artist?.id || 'unknown'}`;
  const albumId = dTrack.album?.id ? `deezer_alb_${dTrack.album.id}` : undefined;
  const title = dTrack.title || 'Untitled Track';
  const artistName = dTrack.artist?.name || 'Unknown Artist';

  const track: Track = {
    id: trackId,
    title,
    artistId,
    artistName,
    albumId,
    albumTitle: dTrack.album?.title || title,
    // Stream endpoint with title & artist so it automatically resolves the full length song
    audioUrl: `/api/stream?id=${trackId}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artistName)}`,
    coverUrl:
      dTrack.album?.cover_big ||
      dTrack.album?.cover_medium ||
      dTrack.artist?.picture_big ||
      dTrack.artist?.picture_medium ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    duration: dTrack.duration || 210, // Full track duration
    genre: dTrack.genre || 'Popular',
    description: `${title} performed by ${artistName}${dTrack.album?.title ? ` • ${dTrack.album.title}` : ''}`,
    lyrics: `[Full length music track: ${title} - ${artistName}]`,
    playCount: dTrack.rank ? Math.min(999999, Math.max(25000, dTrack.rank)) : 45000,
    likesCount: dTrack.rank ? Math.floor(dTrack.rank / 12) : 3200,
    releaseDate: dTrack.album?.release_date || new Date().toISOString().split('T')[0],
    status: 'published',
    isExplicit: Boolean(dTrack.explicit_lyrics),
    waveform: generateWaveform(),
    createdAt: new Date().toISOString()
  };

  trackCache.set(trackId, track);

  if (dTrack.artist?.id) {
    const artist: Artist = {
      id: artistId,
      artistName,
      bio: `Official artist catalog for ${artistName}.`,
      avatar: dTrack.artist.picture_big || dTrack.artist.picture_medium || track.coverUrl,
      banner: dTrack.artist.picture_xl || dTrack.artist.picture_big || track.coverUrl,
      genre: 'Music',
      monthlyListeners: (dTrack.rank || 45000) * 10,
      verified: true,
      createdAt: new Date().toISOString()
    };
    artistCache.set(artistId, artist);
  }

  if (dTrack.album?.id) {
    const album: Album = {
      id: albumId!,
      artistId,
      artistName,
      title: dTrack.album.title,
      description: `Album release by ${artistName}.`,
      coverUrl: dTrack.album.cover_big || dTrack.album.cover_medium || track.coverUrl,
      releaseDate: dTrack.album.release_date || new Date().toISOString().split('T')[0],
      genre: 'Music',
      trackCount: 1,
      duration: dTrack.duration || 210
    };
    albumCache.set(albumId!, album);
  }

  return track;
}

// Resolve full length audio URL for any track title and artist
async function resolveFullLengthAudio(title: string, artist: string): Promise<string | null> {
  const cacheKey = `${title.toLowerCase().trim()}|||${artist.toLowerCase().trim()}`;
  if (fullAudioUrlCache.has(cacheKey)) {
    return fullAudioUrlCache.get(cacheKey)!;
  }

  // 1. Query full track audio from high-quality database
  try {
    const searchTerms = [
      `${artist} ${title}`.trim(),
      title.trim()
    ];

    for (const term of searchTerms) {
      const res = await fetch(
        `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(term)}&_format=json&_marker=0&api_version=4&ctx=web6dot0`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (!res.ok) continue;

      const data = await res.json();
      if (!data?.results || !Array.isArray(data.results) || data.results.length === 0) continue;

      for (const song of data.results) {
        if (song?.more_info?.encrypted_media_url) {
          const directUrl = decryptMediaUrl(song.more_info.encrypted_media_url);
          if (directUrl) {
            fullAudioUrlCache.set(cacheKey, directUrl);
            return directUrl;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error querying full track audio by title/artist:', err);
  }

  return null;
}

export const streamService = {
  getTrackById(id: string): Track | null {
    if (trackCache.has(id)) {
      return trackCache.get(id)!;
    }
    const local = db.getTrackById(id);
    if (local) return local;
    return null;
  },

  getArtistById(id: string): Artist | null {
    if (artistCache.has(id)) {
      return artistCache.get(id)!;
    }
    const local = db.getArtistById(id);
    if (local) return local;
    return null;
  },

  getAlbumById(id: string): Album | null {
    if (albumCache.has(id)) {
      return albumCache.get(id)!;
    }
    const local = db.getAlbumById(id);
    if (local) return local;
    return null;
  },

  resolveYouTubeVideoId,

  // Search songs and return FULL LENGTH tracks
  async searchMusic(query: string): Promise<SearchResults> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }

    const localResults = db.search(cleanQuery);
    const combinedTracks: Track[] = [...localResults.tracks];
    const seenKeys = new Set(localResults.tracks.map((t) => `${t.title.toLowerCase()}|||${t.artistName.toLowerCase()}`));
    const collectedArtists = new Map<string, Artist>();
    const collectedAlbums = new Map<string, Album>();

    // 1. Search YouTube first for EXACT, full-length official songs matching the query
    try {
      const ytTracks = await searchYouTube(cleanQuery);
      for (const t of ytTracks) {
        const key = `${t.title.toLowerCase()}|||${t.artistName.toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          combinedTracks.push(t);
        }
        const art = artistCache.get(t.artistId);
        if (art) collectedArtists.set(art.id, art);
      }
    } catch (err) {
      console.warn('YouTube music search error:', err);
    }

    // 2. Search Deezer catalog for global hits and metadata
    try {
      const dRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(cleanQuery)}&limit=25`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (dRes.ok) {
        const dData = await dRes.json();
        if (dData?.data && Array.isArray(dData.data)) {
          for (const item of dData.data) {
            const track = formatDeezerTrack(item);
            const key = `${track.title.toLowerCase()}|||${track.artistName.toLowerCase()}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              combinedTracks.push(track);
            }
            const art = artistCache.get(track.artistId);
            if (art && !collectedArtists.has(art.id)) collectedArtists.set(art.id, art);
            if (track.albumId) {
              const alb = albumCache.get(track.albumId);
              if (alb && !collectedAlbums.has(alb.id)) collectedAlbums.set(alb.id, alb);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Deezer search error:', err);
    }

    // 3. Search high-quality catalog (JioSaavn), excluding nightcore / karaoke / instrumental remixes
    try {
      const sRes = await fetch(
        `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(cleanQuery)}&_format=json&_marker=0&api_version=4&ctx=web6dot0`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData?.results && Array.isArray(sData.results)) {
          const badPatterns = /nightcore|karaoke|instrumental|sped up|slowed|tribute/i;
          for (const s of sData.results) {
            if (badPatterns.test(s.title || '')) continue;
            const track = formatSaavnSong(s);
            const key = `${track.title.toLowerCase()}|||${track.artistName.toLowerCase()}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              combinedTracks.push(track);
            }
            const art = artistCache.get(track.artistId);
            if (art) collectedArtists.set(art.id, art);
            if (track.albumId) {
              const alb = albumCache.get(track.albumId);
              if (alb) collectedAlbums.set(alb.id, alb);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Saavn full music search error:', err);
    }

    return {
      tracks: combinedTracks,
      artists: [...localResults.artists, ...Array.from(collectedArtists.values())],
      albums: [...localResults.albums, ...Array.from(collectedAlbums.values())],
      playlists: localResults.playlists
    };
  },

  // Fetch top global charts with full audio streaming
  async getChartTracks(limit = 20): Promise<Track[]> {
    try {
      const res = await fetch(`https://api.deezer.com/chart/0/tracks?limit=${limit}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.data && Array.isArray(data.data)) {
          const tracks = data.data.map(formatDeezerTrack);
          // Pre-resolve YouTube IDs for top tracks so they play instantly in full length
          await Promise.allSettled(
            tracks.slice(0, 10).map(async (t: Track) => {
              const r = await resolveYouTubeVideoId(t.title, t.artistName);
              if (r.videoId) {
                t.youtubeId = r.videoId;
                t.source = 'youtube';
                trackCache.set(t.id, t);
              }
            })
          );
          return tracks;
        }
      }
    } catch (e) {
      console.warn('Chart fetch error:', e);
    }
    return db.getTrendingTracks(limit);
  },

  // Proxies full length audio bytes with HTTP 206 Partial Content Range support
  async proxyStream(req: Request, res: Response) {
    const videoId = (req.query.videoId as string) || '';
    const id = (req.query.id as string) || (req.query.trackId as string) || '';
    let title = (req.query.title as string) || '';
    let artist = (req.query.artist as string) || '';
    const q = (req.query.q as string) || '';

    let directAudioUrl: string | null = null;

    // A. Check cache by ID
    if (id && fullAudioUrlCache.has(id)) {
      directAudioUrl = fullAudioUrlCache.get(id)!;
    }

    // B. If videoId provided (YouTube / yt-dlp)
    if (!directAudioUrl && videoId) {
      try {
        const ytdlpPath = path.join(process.cwd(), 'yt-dlp');
        const executable = fs.existsSync(ytdlpPath) ? ytdlpPath : 'yt-dlp';
        const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Use tv_embedded player client to bypass YouTube datacenter bot check
        const extractedUrl = await new Promise<string>((resolve, reject) => {
          execFile(
            executable,
            ['--extractor-args', 'youtube:player_client=tv_embedded', '-g', '-f', 'bestaudio', '--no-playlist', ytUrl],
            { timeout: 7000 },
            (error, stdout) => {
              if (error || !stdout.trim()) {
                reject(error || new Error('No output from yt-dlp'));
              } else {
                resolve(stdout.trim().split('\n')[0]);
              }
            }
          );
        });

        if (extractedUrl && extractedUrl.startsWith('http')) {
          directAudioUrl = extractedUrl;
        }
      } catch (err) {
        console.warn('yt-dlp extraction failed, falling back to full audio resolver:', err);
      }

      // If yt-dlp was blocked by YouTube, resolve title via oEmbed and resolve full song
      if (!directAudioUrl) {
        try {
          const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            const cleanTitle = (oembedData?.title || '')
              .replace(/\(Official.*?\)|\[Official.*?\]|Official Video|Audio|Lyric Video/gi, '')
              .trim();
            if (cleanTitle) {
              directAudioUrl = await resolveFullLengthAudio(cleanTitle, oembedData?.author_name || '');
            }
          }
        } catch (e) {
          console.warn('oEmbed resolve error:', e);
        }
      }
    }

    // C. If saavn track ID
    if (!directAudioUrl && id.startsWith('saavn_')) {
      const pid = id.replace('saavn_', '');
      try {
        const dRes = await fetch(
          `https://www.jiosaavn.com/api.php?__call=song.getDetails&pids=${pid}&_format=json&_marker=0&api_version=4&ctx=web6dot0`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        if (dRes.ok) {
          const dData = await dRes.json();
          const songObj = dData?.songs?.[0] || dData?.[pid];
          if (songObj?.more_info?.encrypted_media_url) {
            directAudioUrl = decryptMediaUrl(songObj.more_info.encrypted_media_url);
            if (directAudioUrl) {
              fullAudioUrlCache.set(id, directAudioUrl);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching Saavn track details:', err);
      }
    }

    // D. If track in trackCache, extract title & artist
    if (!title && !artist && id && trackCache.has(id)) {
      const cached = trackCache.get(id)!;
      title = cached.title;
      artist = cached.artistName;
    }

    // E. If track in local DB, extract title & artist
    if (!title && !artist && id) {
      const local = db.getTrackById(id);
      if (local) {
        title = local.title;
        artist = local.artistName;
        // If local track is an uploaded file
        if (local.audioUrl.startsWith('/uploads/')) {
          const filename = local.audioUrl.replace('/uploads/', '');
          const filePath = path.join(process.cwd(), 'uploads', filename);
          if (fs.existsSync(filePath)) {
            return serveLocalFile(filePath, req, res);
          }
        }
      }
    }

    // F. Resolve full audio by title & artist or query q
    if (!directAudioUrl && (title || q)) {
      const searchTitle = title || q;
      directAudioUrl = await resolveFullLengthAudio(searchTitle, artist);
    }

    // G. Fallback to Deezer preview only if full track was completely unresolvable
    if (!directAudioUrl && id.startsWith('deezer_')) {
      const numId = id.replace('deezer_', '');
      try {
        const dRes = await fetch(`https://api.deezer.com/track/${numId}`);
        if (dRes.ok) {
          const dData = await dRes.json();
          if (dData?.preview) {
            directAudioUrl = dData.preview;
          }
        }
      } catch (e) {
        console.warn('Fallback Deezer preview lookup error:', e);
      }
    }

    if (!directAudioUrl) {
      return res.status(404).json({ error: 'Full length audio stream not found for the requested track.' });
    }

    // Proxy audio stream with HTTP 206 Partial Content Range support
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
        'Accept': '*/*'
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      let upstreamRes = await fetch(directAudioUrl, { headers });

      // If high bitrate 320kbps was not available on server, try 160kbps or fallback
      if (!upstreamRes.ok && upstreamRes.status !== 206 && directAudioUrl.includes('_320.mp4')) {
        const fallback160 = directAudioUrl.replace('_320.mp4', '_160.mp4');
        upstreamRes = await fetch(fallback160, { headers });
      }

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        return res.status(upstreamRes.status).json({ error: `Upstream audio error: ${upstreamRes.statusText}` });
      }

      return forwardStream(upstreamRes, req, res);
    } catch (err: any) {
      console.error('Audio stream proxy error:', err);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Failed to stream audio bytes from provider.' });
      }
    }
  }
};

function forwardStream(upstreamRes: globalThis.Response, req: Request, res: Response) {
  const status = upstreamRes.status;
  const contentType = upstreamRes.headers.get('content-type') || 'audio/mp4';
  const contentLength = upstreamRes.headers.get('content-length');
  const contentRange = upstreamRes.headers.get('content-range');
  const acceptRanges = upstreamRes.headers.get('accept-ranges') || 'bytes';

  res.status(status);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Accept-Ranges', acceptRanges);
  res.setHeader('Cache-Control', 'public, max-age=86400');

  if (contentLength) {
    res.setHeader('Content-Length', contentLength);
  }
  if (contentRange) {
    res.setHeader('Content-Range', contentRange);
  }

  if (upstreamRes.body) {
    const nodeStream = Readable.fromWeb(upstreamRes.body as any);

    req.on('close', () => {
      nodeStream.destroy();
    });

    nodeStream.on('error', (err) => {
      console.warn('Stream pipe error:', err.message);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    nodeStream.pipe(res);
  } else {
    res.end();
  }
}

function serveLocalFile(filePath: string, req: Request, res: Response) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'audio/mpeg';
  if (ext === '.wav') contentType = 'audio/wav';
  else if (ext === '.ogg') contentType = 'audio/ogg';
  else if (ext === '.flac') contentType = 'audio/flac';
  else if (ext === '.m4a' || ext === '.mp4') contentType = 'audio/mp4';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}
