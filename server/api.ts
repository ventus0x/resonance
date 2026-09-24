import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { db, verifyPassword } from './db.ts';
import { generateSynthesizedTrackWav } from './audioGenerator.ts';
import { streamService } from './streamService.ts';

const router = express.Router();
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const cleanName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${cleanName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 300 * 1024 * 1024 // 300MB max - allows full lossless FLAC, WAV, mixes, and any audio
  },
  fileFilter: (req, file, cb) => {
    // Permit any audio file, image, or media container without errors
    cb(null, true);
  }
});

// Authentication session token helper
const activeSessions = new Map<string, { userId: string; role: string; expires: number }>();

function createSessionToken(userId: string, role: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  // 7 days expiration
  activeSessions.set(token, {
    userId,
    role,
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000
  });
  return token;
}

// Middleware: optional auth (allows anonymous, populates req.user if valid token provided)
export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string; email: string; username: string };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);
  if (session && session.expires > Date.now()) {
    const user = db.findUserById(session.userId);
    if (user && !user.isSuspended) {
      req.user = {
        id: user.id,
        role: user.role,
        email: user.email,
        username: user.username
      };
    }
  }
  next();
}

// Middleware: require logged in
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required for this action.' });
  }
  next();
}

// Middleware: require creator or admin
export function requireCreator(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'creator' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Creator account required to upload or manage music.' });
  }
  next();
}

// Middleware: require admin
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative privileges required.' });
  }
  next();
}

router.use(authMiddleware);

// ==========================================
// 1. PUBLIC DISCOVERY & STREAMING (NO LOGIN)
// ==========================================

// GET /api/stream (Direct chunked audio streaming proxy with HTTP 206 Range support)
router.get('/stream', (req, res) => {
  streamService.proxyStream(req, res);
});

// GET /api/resolve-youtube (Fast resolution of official full-length videoId for audio playback)
router.get('/resolve-youtube', async (req, res) => {
  const title = (req.query.title as string) || '';
  const artist = (req.query.artist as string) || '';
  const fallback = (req.query.fallback as string) || undefined;
  try {
    const result = await streamService.resolveYouTubeVideoId(title, artist, fallback);
    res.json(result);
  } catch (err) {
    res.status(500).json({ videoId: null, duration: 210, error: 'Resolution failed' });
  }
});

// GET /api/tracks
router.get('/tracks', (req, res) => {
  const { genre, artistId, albumId, status } = req.query;
  const tracks = db.getAllTracks({
    genre: genre as string,
    artistId: artistId as string,
    albumId: albumId as string,
    status: status as string
  });
  res.json({ tracks });
});

// GET /api/trending
router.get('/trending', async (req, res) => {
  try {
    const tracks = await streamService.getChartTracks(10);
    res.json({ tracks });
  } catch {
    const tracks = db.getTrendingTracks(10);
    res.json({ tracks });
  }
});

// GET /api/new-releases
router.get('/new-releases', async (req, res) => {
  try {
    const chartTracks = await streamService.getChartTracks(16);
    const localTracks = db.getNewReleases(6);
    const tracks = [...localTracks, ...chartTracks.slice(6, 12)];
    res.json({ tracks });
  } catch {
    const tracks = db.getNewReleases(8);
    res.json({ tracks });
  }
});

// GET /api/tracks/:id
router.get('/tracks/:id', (req, res) => {
  const track = streamService.getTrackById(req.params.id) || db.getTrackById(req.params.id);
  if (!track) {
    return res.status(404).json({ error: 'Track not found.' });
  }
  const artist = streamService.getArtistById(track.artistId) || db.getArtistById(track.artistId);
  const album = track.albumId ? (streamService.getAlbumById(track.albumId) || db.getAlbumById(track.albumId)) : null;
  const moreFromArtist = db.getAllTracks({ artistId: track.artistId }).filter((t) => t.id !== track.id).slice(0, 5);
  const moreLikeThis = db.getAllTracks({ genre: track.genre }).filter((t) => t.id !== track.id && t.artistId !== track.artistId).slice(0, 5);

  res.json({
    track,
    artist,
    album,
    moreFromArtist,
    moreLikeThis
  });
});

// POST /api/tracks/:id/play (Records play count with anti-abuse protection)
router.post('/tracks/:id/play', (req: AuthenticatedRequest, res) => {
  const trackId = req.params.id;
  const sessionId = req.body.sessionId || req.ip || 'anon-session';
  const userId = req.user?.id;

  const recorded = db.recordPlay(trackId, sessionId, userId);
  const track = db.getTrackById(trackId);

  res.json({
    success: true,
    counted: recorded,
    playCount: track?.playCount || 0,
    playingNow: track?.playingNow || db.getPlayingNowCount(trackId)
  });
});

// POST /api/player/heartbeat (Tracks real concurrent "Playing Now" listener sessions)
router.post('/player/heartbeat', (req: AuthenticatedRequest, res) => {
  const { sessionId, trackId, isPlaying } = req.body;
  const effectiveSessionId = sessionId || req.ip || 'anon-player';

  if (!trackId) {
    return res.status(400).json({ error: 'trackId is required.' });
  }

  const result = db.recordPlaybackHeartbeat(effectiveSessionId, trackId, isPlaying !== false, req.user?.id);
  res.json({
    success: true,
    ...result
  });
});

// POST /api/player/stop (Ends active playback session)
router.post('/player/stop', (req, res) => {
  const { sessionId } = req.body;
  const effectiveSessionId = sessionId || req.ip || 'anon-player';
  db.stopPlaybackHeartbeat(effectiveSessionId);
  res.json({ success: true });
});

// GET /api/player/playing-now/:trackId
router.get('/player/playing-now/:trackId', (req, res) => {
  const playingNow = db.getPlayingNowCount(req.params.trackId);
  res.json({ trackId: req.params.trackId, playingNow });
});

// GET /api/audio/synth/:id (Procedural fallback audio synth with HTTP 206 Partial Content Range support)
router.get('/audio/synth/:id', (req, res) => {
  const wavBuffer = generateSynthesizedTrackWav(req.params.id, 30);
  const totalLength = wavBuffer.length;
  const range = req.headers.range;

  res.set({
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=604800, immutable',
    'Content-Type': 'audio/wav'
  });

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${totalLength}`,
      'Content-Length': chunkSize,
      'Content-Type': 'audio/wav'
    });
    res.end(wavBuffer.subarray(start, end + 1));
  } else {
    res.writeHead(200, {
      'Content-Length': totalLength,
      'Content-Type': 'audio/wav'
    });
    res.end(wavBuffer);
  }
});

// Streaming endpoint with HTTP 206 Partial Content range support for uploaded files
router.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found.' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.mp3') contentType = 'audio/mpeg';
  else if (ext === '.wav' || ext === '.wave') contentType = 'audio/wav';
  else if (ext === '.ogg' || ext === '.oga') contentType = 'audio/ogg';
  else if (ext === '.flac') contentType = 'audio/flac';
  else if (ext === '.m4a' || ext === '.mp4') contentType = 'audio/mp4';
  else if (ext === '.aac') contentType = 'audio/aac';
  else if (ext === '.webm') contentType = 'audio/webm';
  else if (ext === '.opus') contentType = 'audio/opus';
  else if (ext === '.wma') contentType = 'audio/x-ms-wma';
  else if (ext === '.aiff' || ext === '.aif') contentType = 'audio/aiff';
  else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.avif') contentType = 'image/avif';
  else if (ext.startsWith('.m') || ext.startsWith('.a')) contentType = 'audio/mpeg';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// GET /api/artists
router.get('/artists', (req, res) => {
  const artists = db.getAllArtists();
  res.json({ artists });
});

// GET /api/artists/:id
router.get('/artists/:id', (req, res) => {
  const artist = db.getArtistById(req.params.id);
  if (!artist) {
    return res.status(404).json({ error: 'Artist not found.' });
  }
  const tracks = db.getAllTracks({ artistId: artist.id });
  const albums = db.getAllAlbums().filter((a) => a.artistId === artist.id);
  const popularTracks = [...tracks].sort((a, b) => b.playCount - a.playCount).slice(0, 5);
  const singles = tracks.filter((t) => !t.albumId);

  res.json({
    artist,
    popularTracks,
    tracks,
    albums,
    singles
  });
});

// GET /api/albums
router.get('/albums', (req, res) => {
  const albums = db.getAllAlbums();
  res.json({ albums });
});

// GET /api/albums/:id
router.get('/albums/:id', (req, res) => {
  const album = db.getAlbumById(req.params.id);
  if (!album) {
    return res.status(404).json({ error: 'Album not found.' });
  }
  const tracks = db.getAllTracks({ albumId: album.id });
  res.json({ album, tracks });
});

// GET /api/playlists
router.get('/playlists', (req, res) => {
  const playlists = db.getAllPlaylists(true);
  res.json({ playlists });
});

// GET /api/playlists/:id
router.get('/playlists/:id', (req, res) => {
  const playlist = db.getPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found.' });
  }
  const tracks = playlist.tracks.map((tid) => db.getTrackById(tid)).filter(Boolean);
  const totalDuration = tracks.reduce((acc, t) => acc + (t?.duration || 0), 0);

  res.json({
    playlist: {
      ...playlist,
      totalDuration,
      resolvedTracks: tracks
    }
  });
});

// GET /api/search (Real music discovery via Deezer & catalog search)
router.get('/search', async (req, res) => {
  const q = (req.query.q as string) || '';
  try {
    const results = await streamService.searchMusic(q);
    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.json(db.search(q));
  }
});

// POST /api/reports (Filing report on content - accessible anonymously or logged in)
router.post('/reports', (req: AuthenticatedRequest, res) => {
  const { trackId, reason, notes } = req.body;
  if (!trackId || !reason) {
    return res.status(400).json({ error: 'Track ID and reason are required.' });
  }
  const report = db.createReport({
    trackId,
    reason,
    notes,
    reporterId: req.user?.id,
    reporterName: req.user?.username
  });
  res.status(201).json({ success: true, report });
});

// ==========================================
// 2. AUTHENTICATION ENDPOINTS
// ==========================================

// ==========================================
// 2. AUTHENTICATION & EMAIL VERIFICATION
// ==========================================

// POST /api/auth/send-code (Email Verification System)
router.post('/auth/send-code', (req, res) => {
  const { email, purpose = 'register' } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const result = db.sendVerificationCode(email, purpose);
  res.json({
    success: true,
    message: `Verification code sent to ${email}.`,
    email: result.email,
    code: result.code, // Returned for interactive preview / immediate testing
    expiresAt: result.expiresAt
  });
});

// POST /api/auth/verify-code
router.post('/auth/verify-code', (req, res) => {
  const { email, code, purpose } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  const isValid = db.verifyCode(email, code, purpose);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new code.' });
  }

  res.json({ success: true, verified: true, message: 'Email successfully verified.' });
});

// GET /api/auth/email-outbox (View dispatched emails / verification logs)
router.get('/auth/email-outbox', (req, res) => {
  const email = req.query.email as string | undefined;
  const outbox = db.getEmailOutbox(email);
  res.json({ outbox });
});

// POST /api/auth/register
router.post('/auth/register', (req, res) => {
  const { username, email, password, role = 'creator', bio, code } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const existing = db.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // If verification code is provided, verify it
  let emailVerified = false;
  if (code) {
    const isCodeValid = db.verifyCode(email, code, 'register');
    if (!isCodeValid) {
      return res.status(400).json({ error: 'Invalid or expired email verification code. Please check your inbox or request a new code.' });
    }
    emailVerified = true;
  }

  const userRole = role === 'admin' ? 'creator' : role; // prevent self-assigning admin on signup
  const user = db.createUser({
    username,
    email,
    password,
    role: userRole as 'user' | 'creator',
    bio,
    emailVerified
  });

  const token = createSessionToken(user.id, user.role);
  res.status(201).json({ user, token });
});

// POST /api/auth/login-with-code (Passwordless email verification login)
router.post('/auth/login-with-code', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  const isValid = db.verifyCode(email, code, 'login');
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid or expired email verification code.' });
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'No user found for this email address. Please register first.' });
  }

  if (user.isSuspended) {
    return res.status(403).json({ error: 'This account has been suspended by administration.' });
  }

  const token = createSessionToken(user.id, user.role);
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

// POST /api/auth/admin/send-otp (Sends login OTP to ventux0x@gmail.com with rate limit)
router.post('/auth/admin/send-otp', (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string' || email.trim().toLowerCase() !== 'ventux0x@gmail.com') {
    return res.status(403).json({
      error: 'Administrator OTP requests are exclusively restricted to the designated administrator account (ventux0x@gmail.com).'
    });
  }

  const result = db.sendAdminOtp(email);
  if (!result.success) {
    return res.status(result.retryAfter ? 429 : 400).json({
      error: result.error,
      retryAfter: result.retryAfter
    });
  }

  res.json(result);
});

// POST /api/auth/admin/login (Passwordless Admin Login with OTP code only - no password required)
router.post('/auth/admin/login', (req, res) => {
  const { email, code } = req.body;

  if (!email || email.trim().toLowerCase() !== 'ventux0x@gmail.com') {
    return res.status(403).json({
      error: 'Only the authorized administrator email (ventux0x@gmail.com) can authenticate via this portal.'
    });
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      error: 'Please enter the 6-digit OTP code sent to ventux0x@gmail.com.'
    });
  }

  const result = db.verifyAdminOtp(email, code);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const user = result.user;
  const token = createSessionToken(user.id, 'admin');
  const { passwordHash: _, ...safeUser } = user;
  res.json({
    user: safeUser,
    token,
    message: 'Administrator successfully authenticated via secure email OTP.'
  });
});

// POST /api/auth/login
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (email.trim().toLowerCase() === 'ventux0x@gmail.com') {
    return res.status(400).json({
      error: 'Administrator login requires email OTP verification only (no password required). Please use the Admin OTP portal.'
    });
  }

  const user = db.findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.isSuspended) {
    return res.status(403).json({ error: 'This account has been suspended by administration.' });
  }

  const token = createSessionToken(user.id, user.role);
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

// GET /api/auth/me
router.get('/auth/me', (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.json({ user: null, role: 'anonymous' });
  }
  const user = db.findUserById(req.user.id);
  if (!user) {
    return res.json({ user: null, role: 'anonymous' });
  }
  const { passwordHash: _, ...safeUser } = user;
  const artist = db.getArtistByUserId(user.id);
  res.json({ user: safeUser, artist, role: user.role });
});

// POST /api/auth/logout
router.post('/auth/logout', (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

// ==========================================
// 3. USER INTERACTIONS (LIKES & FOLLOWS)
// ==========================================

// POST /api/tracks/:id/like
router.post('/tracks/:id/like', requireAuth, (req: AuthenticatedRequest, res) => {
  const result = db.toggleLike(req.user!.id, req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Track not found.' });
  }
  res.json(result);
});

// GET /api/user/likes
router.get('/user/likes', requireAuth, (req: AuthenticatedRequest, res) => {
  const likes = db.getUserLikes(req.user!.id);
  const tracks = likes.map((id) => db.getTrackById(id)).filter(Boolean);
  res.json({ likes, tracks });
});

// POST /api/artists/:id/follow
router.post('/artists/:id/follow', requireAuth, (req: AuthenticatedRequest, res) => {
  const result = db.toggleFollow(req.user!.id, req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Artist not found.' });
  }
  res.json(result);
});

// GET /api/user/follows
router.get('/user/follows', requireAuth, (req: AuthenticatedRequest, res) => {
  const follows = db.getUserFollows(req.user!.id);
  const artists = follows.map((id) => db.getArtistById(id)).filter(Boolean);
  res.json({ follows, artists });
});

// ==========================================
// 4. CREATOR ACTIONS (UPLOAD & MANAGEMENT)
// ==========================================

const uploadFields = upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);

// POST /api/tracks/upload (Any authenticated user can upload any song)
router.post('/tracks/upload', requireAuth, uploadFields as any, async (req: AuthenticatedRequest, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const { title, genre, albumId, description, lyrics, isExplicit } = req.body;

    if (!title || !genre) {
      return res.status(400).json({ error: 'Track title and genre are required.' });
    }

    let audioUrl = '';
    let coverUrl = '';

    if (files?.audio?.[0]) {
      audioUrl = `/api/uploads/${files.audio[0].filename}`;
    } else if (req.body.audioUrl && req.body.audioUrl.trim()) {
      audioUrl = req.body.audioUrl.trim();
    } else {
      audioUrl = `/api/audio/synth/${Date.now()}`;
    }

    if (files?.cover?.[0]) {
      coverUrl = `/api/uploads/${files.cover[0].filename}`;
    } else {
      coverUrl = req.body.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80';
    }

    // Get or create artist profile for this user so any user can upload songs
    let artist = db.getArtistByUserId(req.user!.id);
    if (!artist) {
      artist = db.createOrUpdateArtist({
        userId: req.user!.id,
        artistName: req.user!.username,
        genre: genre || 'Electronic'
      });
      // Automatically elevate user role to creator
      if (req.user!.role === 'user') {
        db.updateUser(req.user!.id, { role: 'creator' });
        req.user!.role = 'creator';
      }
    }

    const duration = req.body.duration ? parseInt(req.body.duration, 10) : 180 + Math.floor(Math.random() * 90);

    const newTrack = db.createTrack({
      title,
      artistId: artist.id,
      artistName: artist.artistName,
      albumId: albumId || undefined,
      audioUrl,
      coverUrl,
      duration,
      genre,
      description,
      lyrics,
      releaseDate: new Date().toISOString().split('T')[0],
      status: 'published',
      isExplicit: isExplicit === 'true' || isExplicit === true,
      isPermanentPublic: true,
      uploadedByUserId: req.user!.id
    });

    res.status(201).json({
      success: true,
      message: 'Your track has been uploaded and published. It is now public forever across Resonance until deleted by you or a platform administrator.',
      track: newTrack
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to process audio upload.' });
  }
});

// PATCH /api/tracks/:id
router.patch('/tracks/:id', requireCreator, (req: AuthenticatedRequest, res) => {
  const track = db.getTrackById(req.params.id);
  if (!track) {
    return res.status(404).json({ error: 'Track not found.' });
  }

  const artist = db.getArtistByUserId(req.user!.id);
  const isUploader = (artist && artist.id === track.artistId) || (track.uploadedByUserId === req.user!.id);
  const isAdmin = req.user!.role === 'admin';

  if (!isUploader && !isAdmin) {
    return res.status(403).json({ error: 'You do not have permission to edit this track.' });
  }

  const updated = db.updateTrack(req.params.id, req.body);
  res.json({ success: true, track: updated });
});

// DELETE /api/tracks/:id (Only uploader or administrator can delete)
router.delete('/tracks/:id', requireCreator, (req: AuthenticatedRequest, res) => {
  const track = db.getTrackById(req.params.id);
  if (!track) {
    return res.status(404).json({ error: 'Track not found.' });
  }

  const artist = db.getArtistByUserId(req.user!.id);
  const isUploader = (artist && artist.id === track.artistId) || (track.uploadedByUserId === req.user!.id);
  const isAdmin = req.user!.role === 'admin';

  if (!isUploader && !isAdmin) {
    return res.status(403).json({
      error: 'This track is public forever. Only the original uploader or an administrator can delete it.'
    });
  }

  db.deleteTrack(req.params.id);
  res.json({
    success: true,
    message: isAdmin
      ? `Track removed by platform administrator.`
      : `Track deleted by original uploader.`
  });
});

// POST /api/albums
router.post('/albums', requireCreator, (req: AuthenticatedRequest, res) => {
  const { title, description, coverUrl, genre, releaseDate } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Album title is required.' });
  }

  let artist = db.getArtistByUserId(req.user!.id);
  if (!artist) {
    artist = db.createOrUpdateArtist({
      userId: req.user!.id,
      artistName: req.user!.username,
      genre: genre || 'Various'
    });
  }

  const album = db.createAlbum({
    title,
    artistId: artist.id,
    artistName: artist.artistName,
    description,
    coverUrl: coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    genre: genre || 'Various',
    releaseDate: releaseDate || new Date().toISOString().split('T')[0]
  });

  res.status(201).json({ success: true, album });
});

// POST /api/playlists
router.post('/playlists', requireAuth, (req: AuthenticatedRequest, res) => {
  const { name, description, coverUrl, isPublic = true, tracks = [] } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required.' });
  }

  const playlist = db.createPlaylist({
    name,
    description,
    coverUrl: coverUrl || 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
    userId: req.user!.id,
    userName: req.user!.username,
    isPublic: Boolean(isPublic),
    tracks
  });

  res.status(201).json({ success: true, playlist });
});

// PATCH /api/playlists/:id
router.patch('/playlists/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const playlist = db.getPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found.' });
  }

  if (req.user!.role !== 'admin' && playlist.userId !== req.user!.id) {
    return res.status(403).json({ error: 'You do not have permission to modify this playlist.' });
  }

  const updated = db.updatePlaylist(req.params.id, req.body);
  res.json({ success: true, playlist: updated });
});

// POST /api/playlists/:id/tracks
router.post('/playlists/:id/tracks', requireAuth, (req: AuthenticatedRequest, res) => {
  const { trackId } = req.body;
  const playlist = db.getPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found.' });
  }

  if (req.user!.role !== 'admin' && playlist.userId !== req.user!.id) {
    return res.status(403).json({ error: 'You do not have permission to modify this playlist.' });
  }

  if (!playlist.tracks.includes(trackId)) {
    playlist.tracks.push(trackId);
    db.updatePlaylist(req.params.id, { tracks: playlist.tracks });
  }

  res.json({ success: true, playlist });
});

// DELETE /api/playlists/:id
router.delete('/playlists/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const playlist = db.getPlaylistById(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found.' });
  }

  if (req.user!.role !== 'admin' && playlist.userId !== req.user!.id) {
    return res.status(403).json({ error: 'You do not have permission to delete this playlist.' });
  }

  db.deletePlaylist(req.params.id);
  res.json({ success: true, message: 'Playlist deleted.' });
});

// GET /api/creator/stats
router.get('/creator/stats', requireCreator, (req: AuthenticatedRequest, res) => {
  const stats = db.getCreatorStats(req.user!.id);
  res.json(stats);
});

// ==========================================
// 5. ADMIN MODERATION ENDPOINTS
// ==========================================

// GET /api/admin/stats
router.get('/admin/stats', requireAdmin, (req, res) => {
  const stats = db.getAdminStats();
  res.json(stats);
});

// GET /api/admin/reports
router.get('/admin/reports', requireAdmin, (req, res) => {
  const reports = db.getAllReports();
  res.json({ reports });
});

// PATCH /api/admin/reports/:id
router.patch('/admin/reports/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { status, actionNote, hideTrack } = req.body;
  const report = db.updateReportStatus(req.params.id, status, req.user!.id, actionNote);
  if (!report) {
    return res.status(404).json({ error: 'Report not found.' });
  }

  if (hideTrack) {
    db.updateTrack(report.trackId, { status: 'hidden' });
  }

  res.json({ success: true, report });
});

// PATCH /api/admin/tracks/:id/status
router.patch('/admin/tracks/:id/status', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { status } = req.body;
  const track = db.updateTrack(req.params.id, { status });
  if (!track) {
    return res.status(404).json({ error: 'Track not found.' });
  }
  db.recordAuditLog(
    req.user!.id,
    'UPDATE_TRACK_STATUS',
    `Track "${track.title}" (${track.id}) status set to "${status}" by admin ${req.user!.username}`
  );
  res.json({ success: true, track });
});

// GET /api/admin/users
router.get('/admin/users', requireAdmin, (req, res) => {
  const users = db.getAllUsers();
  res.json({ users });
});

// PATCH /api/admin/users/:id/suspend
router.patch('/admin/users/:id/suspend', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { isSuspended } = req.body;
  const user = db.updateUser(req.params.id, { isSuspended });
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  db.recordAuditLog(
    req.user!.id,
    isSuspended ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
    `User "${user.username}" (${user.email}) was ${isSuspended ? 'suspended' : 'reactivated'} by admin ${req.user!.username}`
  );
  res.json({ success: true, user });
});

// GET /api/admin/audit-logs
router.get('/admin/audit-logs', requireAdmin, (req, res) => {
  const logs = db.getAuditLogs();
  res.json({ logs });
});

export default router;
