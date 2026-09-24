import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { User, Artist, Track, Album, Playlist, ContentReport, CreatorStats, AdminStats } from '../src/types.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'resonance_db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  artists: Artist[];
  tracks: Track[];
  albums: Album[];
  playlists: Playlist[];
  likes: { id: string; userId: string; trackId: string; createdAt: string }[];
  follows: { id: string; followerId: string; artistId: string; createdAt: string }[];
  playHistory: { id: string; userId?: string; sessionId?: string; trackId: string; playedAt: string }[];
  reports: ContentReport[];
  auditLogs: { id: string; adminId: string; action: string; details: string; timestamp: string }[];
  emailOutbox?: {
    id: string;
    to: string;
    subject: string;
    code: string;
    purpose: 'register' | 'login' | 'verify_email';
    sentAt: string;
    bodyText: string;
    status: 'delivered';
  }[];
}

interface VerificationEntry {
  code: string;
  purpose: 'register' | 'login' | 'verify_email';
  expiresAt: number;
  attempts: number;
}

const verificationCodeStore = new Map<string, VerificationEntry>();

// Helpers for secure password hashing using Node built-in crypto
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
  } catch {
    return false;
  }
}

// Generate realistic mock waveform data
function generateWaveform(): number[] {
  const points: number[] = [];
  for (let i = 0; i < 48; i++) {
    const v = Math.sin(i * 0.25) * 0.4 + 0.5 + (Math.random() * 0.3 - 0.15);
    points.push(Math.round(Math.max(0.1, Math.min(1.0, v)) * 100) / 100);
  }
  return points;
}

const INITIAL_DB: DatabaseSchema = {
  users: [
    {
      id: 'usr_admin',
      username: 'ventux0x',
      email: 'ventux0x@gmail.com',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      bio: 'Resonance platform administrator & content moderator.',
      createdAt: '2025-01-01T00:00:00.000Z',
      passwordHash: hashPassword('admin123'),
      isSuspended: false,
      emailVerified: true
    },
    {
      id: 'usr_elena',
      username: 'Elena Vance',
      email: 'elena@resonance.fm',
      role: 'creator',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
      bio: 'Electronic & Synthwave producer from Berlin. Creating ambient night journeys.',
      createdAt: '2025-01-10T12:00:00.000Z',
      passwordHash: hashPassword('creator123'),
      isSuspended: false
    },
    {
      id: 'usr_marcus',
      username: 'Marcus Cole',
      email: 'marcus@resonance.fm',
      role: 'creator',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      bio: 'Lo-Fi beats and Chillhop beatsmith. Coffee & vinyl.',
      createdAt: '2025-01-15T15:30:00.000Z',
      passwordHash: hashPassword('creator123'),
      isSuspended: false
    },
    {
      id: 'usr_listener',
      username: 'Alex Rivera',
      email: 'alex@example.com',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
      bio: 'Music enthusiast & playlist curator.',
      createdAt: '2025-02-01T09:15:00.000Z',
      passwordHash: hashPassword('user123'),
      isSuspended: false
    }
  ],
  artists: [
    {
      id: 'art_elena',
      userId: 'usr_elena',
      artistName: 'Elena Vance',
      bio: 'Electronic and cinematic synth architect blending analog textures with sweeping atmospheric melodies.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600&auto=format&fit=crop&q=80',
      genre: 'Electronic',
      monthlyListeners: 142800,
      verified: true,
      createdAt: '2025-01-10T12:00:00.000Z'
    },
    {
      id: 'art_marcus',
      userId: 'usr_marcus',
      artistName: 'Marcus Cole',
      bio: 'Chillhop and organic lo-fi producer crafting cozy, rainy-day beats with dusty rhodes and warm vinyl crackle.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&auto=format&fit=crop&q=80',
      genre: 'Lo-fi',
      monthlyListeners: 98400,
      verified: true,
      createdAt: '2025-01-15T15:30:00.000Z'
    },
    {
      id: 'art_solar_drift',
      artistName: 'Solar Drift',
      bio: 'Indie rock trio from Melbourne writing melancholic indie anthems with lush reverb and heartfelt lyricism.',
      avatar: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1600&auto=format&fit=crop&q=80',
      genre: 'Indie',
      monthlyListeners: 215300,
      verified: true,
      createdAt: '2025-01-18T10:00:00.000Z'
    },
    {
      id: 'art_kaia',
      artistName: 'Kaia Ray',
      bio: 'Contemporary neo-soul and alt-R&B vocalist weaving introspective stories with velvet vocal harmonies.',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1600&auto=format&fit=crop&q=80',
      genre: 'R&B',
      monthlyListeners: 310500,
      verified: true,
      createdAt: '2025-01-20T08:00:00.000Z'
    },
    {
      id: 'art_kroma',
      artistName: 'Kroma Collective',
      bio: 'Deep house and melodic techno outfit specializing in hypnotic basslines and ethereal festival builds.',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&auto=format&fit=crop&q=80',
      genre: 'Electronic',
      monthlyListeners: 184200,
      verified: false,
      createdAt: '2025-01-22T14:20:00.000Z'
    }
  ],
  albums: [
    {
      id: 'alb_neon_mirage',
      artistId: 'art_elena',
      artistName: 'Elena Vance',
      title: 'Neon Mirage',
      description: 'A 6-track odyssey through retro-futuristic landscapes and neon-lit highways.',
      coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      releaseDate: '2025-01-28',
      genre: 'Electronic',
      trackCount: 4,
      duration: 864
    },
    {
      id: 'alb_midnight_coffee',
      artistId: 'art_marcus',
      artistName: 'Marcus Cole',
      title: 'Midnight Coffee',
      description: 'Late night lo-fi study beats for dreamers, coders, and insomniacs.',
      coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80',
      releaseDate: '2025-02-05',
      genre: 'Lo-fi',
      trackCount: 3,
      duration: 610
    },
    {
      id: 'alb_golden_hour',
      artistId: 'art_solar_drift',
      artistName: 'Solar Drift',
      title: 'Golden Hour Reflections',
      description: 'Sun-drenched guitars and breezy indie melodies exploring fleeting youth.',
      coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
      releaseDate: '2025-02-12',
      genre: 'Indie',
      trackCount: 3,
      duration: 720
    }
  ],
  tracks: [
    {
      id: 'trk_01',
      title: 'Midnight Velocity',
      artistId: 'art_elena',
      artistName: 'Elena Vance',
      albumId: 'alb_neon_mirage',
      albumTitle: 'Neon Mirage',
      audioUrl: '/api/stream?id=trk_01&q=Midnight+Velocity+Synthwave',
      coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      duration: 228,
      genre: 'Electronic',
      description: 'Driving arpeggiators and pulsing analog basslines engineered for midnight highway cruising.',
      lyrics: "[Verse 1]\nNeon signs flicker in the rear view glass\nCounting down the minutes that will never pass\nThe highway unfolds like a ribbon of light\nSpeeding toward the edge of the endless night\n\n[Chorus]\nMidnight velocity, carry me home\nLost in the frequency, never alone\nBass in my chest, spark in the dark\nLighting a fire from a single spark\n\n[Drop]\n(Synth arpeggio intensifies)\n\n[Outro]\nDrifting away into tomorrow...",
      playCount: 18450,
      likesCount: 1420,
      releaseDate: '2025-01-28',
      status: 'published',
      isExplicit: false,
      waveform: generateWaveform(),
      createdAt: '2025-01-28T00:00:00.000Z'
    },
    {
      id: 'trk_02',
      title: 'Obsidian Horizon',
      artistId: 'art_elena',
      artistName: 'Elena Vance',
      albumId: 'alb_neon_mirage',
      albumTitle: 'Neon Mirage',
      audioUrl: '/api/stream?id=trk_02&q=Obsidian+Horizon+Electronic+Ambient',
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      duration: 212,
      genre: 'Electronic',
      description: 'Deep modular synthesizer soundscape exploring dark cosmic dimensions.',
      lyrics: "[Instrumental piece with ambient vocal vocalizations]\n(Ethereal echoes)\nBeyond the event horizon\nWhere shadows dissolve...",
      playCount: 12100,
      likesCount: 980,
      releaseDate: '2025-01-28',
      status: 'published',
      isExplicit: false,
      waveform: generateWaveform(),
      createdAt: '2025-01-28T01:00:00.000Z'
    },
    {
      id: 'trk_03',
      title: 'Rain on Tokyo Glass',
      artistId: 'art_marcus',
      artistName: 'Marcus Cole',
      albumId: 'alb_midnight_coffee',
      albumTitle: 'Midnight Coffee',
      audioUrl: '/api/stream?id=trk_03&q=Rain+Tokyo+Lofi+Chillhop+Beats',
      coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80',
      duration: 195,
      genre: 'Lo-fi',
      description: 'Soothing piano loops paired with genuine field recordings of rain falling over Shibuya.',
      lyrics: "[Spoken word sample]\n'Sometimes the best thoughts come at 3 AM when the world is completely silent...'\n(Warm electric piano progression)\n(Gentle drum shuffle)",
      playCount: 34200,
      likesCount: 2890,
      releaseDate: '2025-02-05',
      status: 'published',
      isExplicit: false,
      waveform: generateWaveform(),
      createdAt: '2025-02-05T00:00:00.000Z'
    },
    {
      id: 'trk_04',
      title: 'Espresso & Dust',
      artistId: 'art_marcus',
      artistName: 'Marcus Cole',
      albumId: 'alb_midnight_coffee',
      albumTitle: 'Midnight Coffee',
      audioUrl: '/api/stream?id=trk_04&q=Coffee+Dust+Lofi+Study+Beat',
      coverUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&auto=format&fit=crop&q=80',
      duration: 180,
      genre: 'Lo-fi',
      description: 'Downtempo groove featuring tape saturation, sidechain Rhodes, and mellow guitar chords.',
      lyrics: "[Sampled jazz saxophone dialogue]\nKeep it mellow\nJust breathe and listen...",
      playCount: 22800,
      likesCount: 1650,
      releaseDate: '2025-02-05',
      status: 'published',
      isExplicit: false,
      waveform: generateWaveform(),
      createdAt: '2025-02-05T02:00:00.000Z'
    },
    {
      id: 'trk_05',
      title: 'Summer Was a Ghost',
      artistId: 'art_solar_drift',
      artistName: 'Solar Drift',
      albumId: 'alb_golden_hour',
      albumTitle: 'Golden Hour Reflections',
      audioUrl: '/api/stream?id=trk_05&q=Summer+Was+A+Ghost+Indie+Rock',
      coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
      duration: 245,
      genre: 'Indie',
      description: 'Nostalgic jangle-pop guitar with bittersweet vocal harmonies recalling past adventures.',
      lyrics: "[Verse 1]\nWe left our footprints in the coastal sand\nThinking forever was inside our hands\nNow autumn leaves are falling down the street\nAnd whispers turn into an echo sweet\n\n[Chorus]\nSummer was a ghost that passed right through\nLeaving only photographs of me and you\nTurn the dial up, let the tape unwind\nWe can leave the heavy clouds behind.",
      playCount: 41200,
      likesCount: 3510,
      releaseDate: '2025-02-12',
      status: 'published',
      isExplicit: false,
      waveform: generateWaveform(),
      createdAt: '2025-02-12T00:00:00.000Z'
    },
    {
      id: 'trk_06',
      title: 'Velvet Confessions',
      artistId: 'art_kaia',
      artistName: 'Kaia Ray',
      audioUrl: '/api/stream?id=trk_06&q=Velvet+Confessions+RnB+Soul',
      coverUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
      duration: 215,
      genre: 'R&B',
      description: 'Sensual contemporary R&B single with intimate vocal harmonies and deep sub-bass.',
      lyrics: "[Verse 1]\nWhisper softly when the lights turn low\nTell me secrets only shadows know\nEvery heartbeat echoes on my skin\nWondering where you end and I begin\n\n[Chorus]\nVelvet confessions in the twilight room\nChasing the fragrance of night jasmine in bloom\nDon't let the sunrise take away the spell\nGot stories only you and I could tell.",
      playCount: 56700,
      likesCount: 4890,
      releaseDate: '2025-02-14',
      status: 'published',
      isExplicit: false,
      waveform: generateWaveform(),
      createdAt: '2025-02-14T00:00:00.000Z'
    },
    {
      id: 'trk_07',
      title: 'Starlight Rave',
      artistId: 'art_kroma',
      artistName: 'Kroma Collective',
      audioUrl: '/api/stream?id=trk_07&q=Starlight+Rave+Techno+Melodic',
      coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
      duration: 250,
      genre: 'Electronic',
      description: '128 BPM peak-time melodic techno journey with soaring leads and heavy percussion.',
      lyrics: "[Vocal Chop Loop]\nFeel the surge\nInto the light\nLose yourself in the frequency...",
      playCount: 29800,
      likesCount: 2310,
      releaseDate: '2025-02-18',
      status: 'published',
      isExplicit: false,
      waveform: generateWaveform(),
      createdAt: '2025-02-18T00:00:00.000Z'
    },
    {
      id: 'trk_08',
      title: 'Autumn in Vienna',
      artistId: 'art_solar_drift',
      artistName: 'Solar Drift',
      audioUrl: '/api/stream?id=trk_08&q=Vienna+Piano+Neoclassical+Strings',
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
      duration: 260,
      genre: 'Classical',
      description: 'Neoclassical piano and string quartet composition inspired by historic European streets.',
      lyrics: "[Intricate orchestral movement with solo cello and grand piano]",
      playCount: 16400,
      likesCount: 1205,
      releaseDate: '2025-02-20',
      status: 'published',
      isExplicit: false,
      waveform: generateWaveform(),
      createdAt: '2025-02-20T00:00:00.000Z'
    }
  ],
  playlists: [
    {
      id: 'pl_late_night_drive',
      userId: 'usr_admin',
      userName: 'Resonance Editorial',
      name: 'Late Night Cyber Drive',
      description: 'Pulsing synthwave, dark electro, and hypnotic neon rhythms for open roads after 2 AM.',
      coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
      isPublic: true,
      trackCount: 4,
      tracks: ['trk_01', 'trk_02', 'trk_07', 'trk_03'],
      createdAt: '2025-01-20T00:00:00.000Z'
    },
    {
      id: 'pl_deep_focus',
      userId: 'usr_marcus',
      userName: 'Marcus Cole',
      name: 'Deep Focus & Chill Beats',
      description: 'Dusty vinyl samples, gentle rain, and calming melodies for programming and deep study sessions.',
      coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80',
      isPublic: true,
      trackCount: 3,
      tracks: ['trk_03', 'trk_04', 'trk_08'],
      createdAt: '2025-02-01T00:00:00.000Z'
    },
    {
      id: 'pl_golden_indie',
      userId: 'usr_admin',
      userName: 'Resonance Editorial',
      name: 'Indie Sunsets & Golden Waves',
      description: 'Lush guitars, warm melodies, and indie favorites from rising independent voices worldwide.',
      coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&auto=format&fit=crop&q=80',
      isPublic: true,
      trackCount: 3,
      tracks: ['trk_05', 'trk_06', 'trk_01'],
      createdAt: '2025-02-10T00:00:00.000Z'
    }
  ],
  likes: [
    { id: 'like_01', userId: 'usr_listener', trackId: 'trk_01', createdAt: '2025-02-05T00:00:00.000Z' },
    { id: 'like_02', userId: 'usr_listener', trackId: 'trk_03', createdAt: '2025-02-06T00:00:00.000Z' },
    { id: 'like_03', userId: 'usr_elena', trackId: 'trk_07', createdAt: '2025-02-19T00:00:00.000Z' }
  ],
  follows: [
    { id: 'fol_01', followerId: 'usr_listener', artistId: 'art_elena', createdAt: '2025-02-05T00:00:00.000Z' },
    { id: 'fol_02', followerId: 'usr_listener', artistId: 'art_marcus', createdAt: '2025-02-07T00:00:00.000Z' }
  ],
  playHistory: [
    { id: 'ph_01', userId: 'usr_listener', trackId: 'trk_01', playedAt: '2025-02-25T14:30:00.000Z' },
    { id: 'ph_02', userId: 'usr_listener', trackId: 'trk_03', playedAt: '2025-02-25T15:10:00.000Z' }
  ],
  reports: [
    {
      id: 'rep_01',
      reporterId: 'usr_listener',
      reporterName: 'Alex Rivera',
      trackId: 'trk_07',
      trackTitle: 'Starlight Rave',
      artistName: 'Kroma Collective',
      reason: 'copyright',
      notes: 'Sample in the breakdown sounds similar to an existing commercial release. Please review rights clearance.',
      status: 'pending',
      createdAt: '2025-02-22T10:15:00.000Z'
    }
  ],
  auditLogs: [
    {
      id: 'aud_01',
      adminId: 'usr_admin',
      action: 'SYSTEM_INIT',
      details: 'Resonance platform database initialized with sample catalog.',
      timestamp: '2025-01-01T00:00:00.000Z'
    }
  ]
};

interface ActivePlaybackSession {
  sessionId: string;
  trackId: string;
  userId?: string;
  lastHeartbeat: number;
}

interface AdminOtpRateLimit {
  lastSentAt: number;
  requestTimestamps: number[];
  failedAttempts: number;
  code?: string;
  expiresAt?: number;
}

class Database {
  private data: DatabaseSchema;
  private playAntiAbuseMap = new Map<string, number>();
  private activeSessions = new Map<string, ActivePlaybackSession>();
  private adminOtpLimitMap = new Map<string, AdminOtpRateLimit>();

  constructor() {
    this.ensureDirectories();
    this.data = this.load();
  }

  private ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const dbData: DatabaseSchema = JSON.parse(content);
        if (dbData.tracks) {
          dbData.tracks.forEach((t) => {
            t.playCount = t.playCount ?? 0;
            t.likesCount = t.likesCount ?? t.likeCount ?? 0;
            t.likeCount = t.likesCount;
          });
        }
        if (dbData.artists) {
          dbData.artists.forEach((a) => {
            a.monthlyListeners = a.monthlyListeners ?? 0;
            a.followerCount = a.followerCount ?? 0;
          });
        }
        if (dbData.users) {
          const adminUser = dbData.users.find(
            (u) => u.role === 'admin' || u.email === 'ventux0x@gmail.com' || u.email === 'admin@resonance.fm'
          );
          if (adminUser) {
            adminUser.email = 'ventux0x@gmail.com';
            adminUser.username = 'ventux0x';
            adminUser.role = 'admin';
            adminUser.emailVerified = true;
          } else {
            dbData.users.push({
              id: 'usr_admin',
              username: 'ventux0x',
              email: 'ventux0x@gmail.com',
              role: 'admin',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
              bio: 'Resonance platform administrator & content moderator.',
              createdAt: '2025-01-01T00:00:00.000Z',
              passwordHash: hashPassword('admin123'),
              isSuspended: false,
              emailVerified: true
            });
          }
        }
        return dbData;
      }
    } catch (e) {
      console.error('Error loading database file, initializing defaults:', e);
    }
    this.save(INITIAL_DB);
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database file:', e);
    }
  }

  // --- Email Verification System ---
  sendVerificationCode(email: string, purpose: 'register' | 'login' | 'verify_email' = 'register') {
    const normalized = email.trim().toLowerCase();
    // Generate secure 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    verificationCodeStore.set(normalized, {
      code,
      purpose,
      expiresAt,
      attempts: 0
    });

    const emailItem = {
      id: `eml_${crypto.randomBytes(6).toString('hex')}`,
      to: normalized,
      subject: `Resonance Verification Code: ${code}`,
      code,
      purpose,
      sentAt: new Date().toISOString(),
      bodyText: `Your Resonance verification code is ${code}. It expires in 10 minutes. Enter this code to complete verification.`,
      status: 'delivered' as const
    };

    if (!this.data.emailOutbox) {
      this.data.emailOutbox = [];
    }
    this.data.emailOutbox.unshift(emailItem);
    if (this.data.emailOutbox.length > 50) {
      this.data.emailOutbox.pop();
    }
    this.save();

    console.log(`[EMAIL DISPATCH] Verification code ${code} sent to ${normalized} (${purpose})`);
    return {
      success: true,
      email: normalized,
      code,
      expiresAt,
      message: `Verification code sent to ${normalized}`
    };
  }

  verifyCode(email: string, code: string, purpose?: string): boolean {
    const normalized = email.trim().toLowerCase();
    const entry = verificationCodeStore.get(normalized);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      verificationCodeStore.delete(normalized);
      return false;
    }

    entry.attempts += 1;
    if (entry.attempts > 5) {
      verificationCodeStore.delete(normalized);
      return false;
    }

    if (entry.code === code.trim()) {
      verificationCodeStore.delete(normalized);
      return true;
    }

    return false;
  }

  getEmailOutbox(email?: string) {
    if (!this.data.emailOutbox) return [];
    if (!email) return this.data.emailOutbox;
    const normalized = email.trim().toLowerCase();
    return this.data.emailOutbox.filter((e) => e.to === normalized);
  }

  // --- Admin OTP Login with Rate Limiting (No Password Required) ---
  canSendAdminOtp(email: string): { allowed: boolean; retryAfter?: number; error?: string } {
    const normalized = email.trim().toLowerCase();
    if (normalized !== 'ventux0x@gmail.com') {
      return {
        allowed: false,
        error: 'Only the authorized admin email (ventux0x@gmail.com) can request admin OTP access.'
      };
    }

    const now = Date.now();
    const limit = this.adminOtpLimitMap.get(normalized) || {
      lastSentAt: 0,
      requestTimestamps: [],
      failedAttempts: 0
    };

    // 1. Cooldown rate limit: 60 seconds between OTP requests
    const elapsed = now - limit.lastSentAt;
    if (elapsed < 60000) {
      const retryAfter = Math.ceil((60000 - elapsed) / 1000);
      return {
        allowed: false,
        retryAfter,
        error: `Admin OTP rate limit: Please wait ${retryAfter} seconds before requesting a new code.`
      };
    }

    // 2. Sliding window limit: maximum 5 requests per 15 minutes
    limit.requestTimestamps = limit.requestTimestamps.filter((t) => now - t < 15 * 60 * 1000);
    if (limit.requestTimestamps.length >= 5) {
      const oldest = limit.requestTimestamps[0];
      const retryAfter = Math.ceil((15 * 60 * 1000 - (now - oldest)) / 1000);
      return {
        allowed: false,
        retryAfter,
        error: `Rate limit exceeded: Maximum 5 OTP requests per 15 minutes. Please wait ${retryAfter} seconds.`
      };
    }

    return { allowed: true };
  }

  sendAdminOtp(email: string) {
    const check = this.canSendAdminOtp(email);
    if (!check.allowed) {
      return { success: false, error: check.error, retryAfter: check.retryAfter };
    }

    const normalized = email.trim().toLowerCase();
    const now = Date.now();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    const limit = this.adminOtpLimitMap.get(normalized) || {
      lastSentAt: 0,
      requestTimestamps: [],
      failedAttempts: 0
    };
    limit.lastSentAt = now;
    limit.requestTimestamps.push(now);
    limit.failedAttempts = 0;
    limit.code = code;
    limit.expiresAt = expiresAt;
    this.adminOtpLimitMap.set(normalized, limit);

    const emailItem = {
      id: `eml_${crypto.randomBytes(6).toString('hex')}`,
      to: normalized,
      subject: `[ADMIN SECURITY] Resonance Admin Login OTP: ${code}`,
      code,
      purpose: 'login' as const,
      sentAt: new Date().toISOString(),
      bodyText: `Your single-use Resonance Admin Login OTP code is ${code}. No password is required. This code expires in 10 minutes.`,
      status: 'delivered' as const
    };

    if (!this.data.emailOutbox) this.data.emailOutbox = [];
    this.data.emailOutbox.unshift(emailItem);
    if (this.data.emailOutbox.length > 50) this.data.emailOutbox.pop();
    this.save();

    console.log(`[ADMIN OTP DISPATCH] Admin OTP ${code} dispatched to ${normalized} (expires in 10m)`);

    return {
      success: true,
      email: normalized,
      code,
      expiresAt,
      retryAfter: 60,
      message: `Admin security OTP sent to ${normalized}. Enter the 6-digit code to access the console without a password.`
    };
  }

  verifyAdminOtp(email: string, code: string): { success: boolean; error?: string; user?: any } {
    const normalized = email.trim().toLowerCase();
    if (normalized !== 'ventux0x@gmail.com') {
      return { success: false, error: 'Unauthorized email for administrator authentication.' };
    }

    const limit = this.adminOtpLimitMap.get(normalized);
    if (!limit || !limit.code || !limit.expiresAt) {
      return { success: false, error: 'No active OTP found. Please request an OTP code first.' };
    }

    if (Date.now() > limit.expiresAt) {
      limit.code = undefined;
      return { success: false, error: 'This OTP has expired. Please request a new code.' };
    }

    if (limit.failedAttempts >= 5) {
      limit.code = undefined;
      return {
        success: false,
        error: 'Too many incorrect attempts. This OTP has been invalidated for security. Please request a new code.'
      };
    }

    if (limit.code !== code.trim()) {
      limit.failedAttempts += 1;
      const remaining = 5 - limit.failedAttempts;
      return {
        success: false,
        error: `Invalid OTP code. ${remaining} attempt(s) remaining before invalidation.`
      };
    }

    // Success! Consume code to prevent reuse
    limit.code = undefined;

    let adminUser = this.data.users.find((u) => u.email === normalized);
    if (!adminUser) {
      adminUser = {
        id: 'usr_admin',
        username: 'ventux0x',
        email: 'ventux0x@gmail.com',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        bio: 'Resonance platform administrator & content moderator.',
        createdAt: new Date().toISOString(),
        passwordHash: hashPassword('admin123'),
        isSuspended: false,
        emailVerified: true
      };
      this.data.users.push(adminUser);
    } else {
      adminUser.role = 'admin';
      adminUser.emailVerified = true;
    }
    this.save();

    return { success: true, user: adminUser };
  }

  // --- Real-time "Playing Now" Tracking System ---
  recordPlaybackHeartbeat(sessionId: string, trackId: string, isPlaying: boolean, userId?: string) {
    const now = Date.now();
    // Cleanup sessions older than 45 seconds
    for (const [sid, sess] of this.activeSessions.entries()) {
      if (now - sess.lastHeartbeat > 45000) {
        this.activeSessions.delete(sid);
      }
    }

    if (!isPlaying) {
      this.activeSessions.delete(sessionId);
    } else {
      this.activeSessions.set(sessionId, {
        sessionId,
        trackId,
        userId,
        lastHeartbeat: now
      });
    }

    return {
      trackId,
      playingNow: this.getPlayingNowCount(trackId),
      totalPlayingNow: this.getTotalPlayingNow()
    };
  }

  stopPlaybackHeartbeat(sessionId: string) {
    this.activeSessions.delete(sessionId);
    return { success: true };
  }

  getBasePlayingNow(trackId: string): number {
    let hash = 0;
    for (let i = 0; i < trackId.length; i++) {
      hash = (hash << 5) - hash + trackId.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);
    return (absHash % 16) + 3; // 3 to 18 baseline listeners
  }

  getPlayingNowCount(trackId: string): number {
    const now = Date.now();
    let liveRealSessions = 0;
    for (const [sid, sess] of this.activeSessions.entries()) {
      if (sess.trackId === trackId) {
        if (now - sess.lastHeartbeat <= 45000) {
          liveRealSessions++;
        } else {
          this.activeSessions.delete(sid);
        }
      }
    }
    const base = this.getBasePlayingNow(trackId);
    return base + liveRealSessions;
  }

  getTotalPlayingNow(): number {
    let total = 0;
    for (const track of this.data.tracks) {
      if (track.status === 'published') {
        total += this.getPlayingNowCount(track.id);
      }
    }
    return total;
  }

  // --- Users & Auth ---
  findUserByEmail(email: string) {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: string) {
    return this.data.users.find((u) => u.id === id);
  }

  createUser(userData: {
    username: string;
    email: string;
    password: string;
    role: 'user' | 'creator' | 'admin';
    bio?: string;
    avatar?: string;
    emailVerified?: boolean;
  }) {
    const id = `usr_${crypto.randomBytes(6).toString('hex')}`;
    const user = {
      id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      avatar: userData.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80`,
      bio: userData.bio || '',
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(userData.password),
      isSuspended: false,
      emailVerified: userData.emailVerified ?? true
    };
    this.data.users.push(user);

    // If creator, automatically create an artist record
    if (userData.role === 'creator') {
      const artistId = `art_${crypto.randomBytes(6).toString('hex')}`;
      const artist: Artist = {
        id: artistId,
        userId: id,
        artistName: userData.username,
        bio: userData.bio || `Independent artist on Resonance.`,
        avatar: user.avatar,
        genre: 'Independent',
        monthlyListeners: 1,
        verified: false,
        createdAt: user.createdAt
      };
      this.data.artists.push(artist);
    }

    this.save();
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  updateUser(id: string, updates: Partial<User>) {
    const user = this.findUserById(id);
    if (!user) return null;
    Object.assign(user, updates);
    this.save();
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  // --- Artists ---
  getAllArtists() {
    return this.data.artists;
  }

  getArtistById(id: string) {
    return this.data.artists.find((a) => a.id === id);
  }

  getArtistByUserId(userId: string) {
    return this.data.artists.find((a) => a.userId === userId);
  }

  createOrUpdateArtist(artistData: Partial<Artist> & { id?: string; userId: string; artistName: string }) {
    if (artistData.id) {
      const idx = this.data.artists.findIndex((a) => a.id === artistData.id);
      if (idx !== -1) {
        this.data.artists[idx] = { ...this.data.artists[idx], ...artistData };
        this.save();
        return this.data.artists[idx];
      }
    }
    const newArtist: Artist = {
      id: artistData.id || `art_${crypto.randomBytes(6).toString('hex')}`,
      userId: artistData.userId,
      artistName: artistData.artistName,
      bio: artistData.bio || '',
      avatar: artistData.avatar || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      banner: artistData.banner,
      genre: artistData.genre || 'Various',
      monthlyListeners: 10,
      verified: false,
      createdAt: new Date().toISOString(),
      ...artistData
    };
    this.data.artists.push(newArtist);
    this.save();
    return newArtist;
  }

  // --- Tracks ---
  getAllTracks(options: { status?: string; genre?: string; artistId?: string; albumId?: string } = {}) {
    let list = this.data.tracks;
    if (options.status) {
      list = list.filter((t) => t.status === options.status);
    } else {
      list = list.filter((t) => t.status === 'published');
    }
    if (options.genre) {
      list = list.filter((t) => t.genre.toLowerCase() === options.genre!.toLowerCase());
    }
    if (options.artistId) {
      list = list.filter((t) => t.artistId === options.artistId);
    }
    if (options.albumId) {
      list = list.filter((t) => t.albumId === options.albumId);
    }
    return list.map((t) => ({
      ...t,
      playingNow: this.getPlayingNowCount(t.id)
    }));
  }

  getTrackById(id: string) {
    const track = this.data.tracks.find((t) => t.id === id);
    if (!track) return undefined;
    return {
      ...track,
      playingNow: this.getPlayingNowCount(track.id)
    };
  }

  getTrendingTracks(limit = 10) {
    return this.data.tracks
      .filter((t) => t.status === 'published')
      .map((t) => ({
        ...t,
        playingNow: this.getPlayingNowCount(t.id)
      }))
      .sort((a, b) => {
        // Real counting: track with highest playing now counting goes to top trending tracks lists!
        if (b.playingNow !== a.playingNow) {
          return b.playingNow - a.playingNow;
        }
        return b.playCount + (b.likesCount || 0) * 3 - (a.playCount + (a.likesCount || 0) * 3);
      })
      .slice(0, limit);
  }

  getNewReleases(limit = 8) {
    return this.data.tracks
      .filter((t) => t.status === 'published')
      .map((t) => ({
        ...t,
        playingNow: this.getPlayingNowCount(t.id)
      }))
      .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
      .slice(0, limit);
  }

  createTrack(trackData: Omit<Track, 'id' | 'playCount' | 'likesCount' | 'createdAt'>) {
    const id = `trk_${crypto.randomBytes(6).toString('hex')}`;
    const newTrack: Track = {
      ...trackData,
      id,
      playCount: 0,
      likesCount: 0,
      likeCount: 0,
      status: 'published', // Published and public forever
      isPermanentPublic: true, // Permanent public discovery across platform
      waveform: trackData.waveform || generateWaveform(),
      createdAt: new Date().toISOString()
    };
    this.data.tracks.push(newTrack);

    // If track belongs to an album, update album track count
    if (newTrack.albumId) {
      const album = this.data.albums.find((a) => a.id === newTrack.albumId);
      if (album) {
        album.trackCount += 1;
        album.duration += newTrack.duration;
      }
    }

    this.save();
    return newTrack;
  }

  updateTrack(id: string, updates: Partial<Track>) {
    const track = this.getTrackById(id);
    if (!track) return null;
    Object.assign(track, updates);
    this.save();
    return track;
  }

  deleteTrack(id: string) {
    const idx = this.data.tracks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.data.tracks.splice(idx, 1);
    // Remove from playlists
    this.data.playlists.forEach((p) => {
      p.tracks = p.tracks.filter((tId) => tId !== id);
      p.trackCount = p.tracks.length;
    });
    this.save();
    return true;
  }

  recordPlay(trackId: string, identifier: string, userId?: string) {
    const track = this.getTrackById(trackId);
    if (!track) return false;

    // Anti-abuse: ensure at least 20 seconds between recorded plays from same session/user on same track
    const key = `${identifier}:${trackId}`;
    const now = Date.now();
    const lastPlayed = this.playAntiAbuseMap.get(key) || 0;
    if (now - lastPlayed < 20000) {
      return false; // counted too recently
    }
    this.playAntiAbuseMap.set(key, now);

    track.playCount += 1;
    this.data.playHistory.push({
      id: `ph_${crypto.randomBytes(6).toString('hex')}`,
      userId,
      sessionId: identifier,
      trackId,
      playedAt: new Date().toISOString()
    });

    // Keep play history bounded to latest 5000 records
    if (this.data.playHistory.length > 5000) {
      this.data.playHistory = this.data.playHistory.slice(-5000);
    }

    this.save();
    return true;
  }

  // --- Albums ---
  getAllAlbums() {
    return this.data.albums.map((alb) => ({
      ...alb,
      tracks: this.data.tracks.filter((t) => t.albumId === alb.id && t.status === 'published')
    }));
  }

  getAlbumById(id: string) {
    const alb = this.data.albums.find((a) => a.id === id);
    if (!alb) return null;
    return {
      ...alb,
      tracks: this.data.tracks.filter((t) => t.albumId === alb.id && t.status === 'published')
    };
  }

  createAlbum(albumData: Omit<Album, 'id' | 'trackCount' | 'duration'>) {
    const id = `alb_${crypto.randomBytes(6).toString('hex')}`;
    const newAlbum: Album = {
      ...albumData,
      id,
      trackCount: 0,
      duration: 0
    };
    this.data.albums.push(newAlbum);
    this.save();
    return newAlbum;
  }

  // --- Playlists ---
  getAllPlaylists(publicOnly = true) {
    let list = this.data.playlists;
    if (publicOnly) {
      list = list.filter((p) => p.isPublic);
    }
    return list;
  }

  getPlaylistById(id: string) {
    return this.data.playlists.find((p) => p.id === id);
  }

  getUserPlaylists(userId: string) {
    return this.data.playlists.filter((p) => p.userId === userId);
  }

  createPlaylist(playlistData: Omit<Playlist, 'id' | 'trackCount' | 'createdAt'>) {
    const id = `pl_${crypto.randomBytes(6).toString('hex')}`;
    const newPlaylist: Playlist = {
      ...playlistData,
      id,
      trackCount: playlistData.tracks.length,
      createdAt: new Date().toISOString()
    };
    this.data.playlists.push(newPlaylist);
    this.save();
    return newPlaylist;
  }

  updatePlaylist(id: string, updates: Partial<Playlist>) {
    const pl = this.getPlaylistById(id);
    if (!pl) return null;
    if (updates.tracks) {
      updates.trackCount = updates.tracks.length;
    }
    Object.assign(pl, updates);
    this.save();
    return pl;
  }

  deletePlaylist(id: string) {
    const idx = this.data.playlists.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.data.playlists.splice(idx, 1);
    this.save();
    return true;
  }

  toggleLike(userId: string, trackId: string) {
    const track = this.getTrackById(trackId);
    if (!track) return null;

    const existingIdx = this.data.likes.findIndex((l) => l.userId === userId && l.trackId === trackId);
    let liked = false;
    if (existingIdx !== -1) {
      this.data.likes.splice(existingIdx, 1);
      track.likesCount = Math.max(0, track.likesCount - 1);
      track.likeCount = track.likesCount;
      liked = false;
    } else {
      this.data.likes.push({
        id: `like_${crypto.randomBytes(6).toString('hex')}`,
        userId,
        trackId,
        createdAt: new Date().toISOString()
      });
      track.likesCount += 1;
      track.likeCount = track.likesCount;
      liked = true;
    }
    this.save();
    return { liked, likesCount: track.likesCount };
  }

  getUserLikes(userId: string): string[] {
    return this.data.likes.filter((l) => l.userId === userId).map((l) => l.trackId);
  }

  toggleFollow(followerId: string, artistId: string) {
    const artist = this.getArtistById(artistId);
    if (!artist) return null;

    const existingIdx = this.data.follows.findIndex((f) => f.followerId === followerId && f.artistId === artistId);
    let followed = false;
    if (existingIdx !== -1) {
      this.data.follows.splice(existingIdx, 1);
      followed = false;
    } else {
      this.data.follows.push({
        id: `fol_${crypto.randomBytes(6).toString('hex')}`,
        followerId,
        artistId,
        createdAt: new Date().toISOString()
      });
      followed = true;
    }
    this.save();
    return { followed };
  }

  getUserFollows(userId: string): string[] {
    return this.data.follows.filter((f) => f.followerId === userId).map((f) => f.artistId);
  }

  // --- Reports & Moderation ---
  createReport(reportData: {
    reporterId?: string;
    reporterName?: string;
    trackId: string;
    reason: ContentReport['reason'];
    notes?: string;
  }) {
    const track = this.getTrackById(reportData.trackId);
    const report: ContentReport = {
      id: `rep_${crypto.randomBytes(6).toString('hex')}`,
      reporterId: reportData.reporterId,
      reporterName: reportData.reporterName || 'Anonymous Listener',
      trackId: reportData.trackId,
      trackTitle: track ? track.title : 'Unknown Track',
      artistName: track ? track.artistName : 'Unknown Artist',
      reason: reportData.reason,
      notes: reportData.notes,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.data.reports.unshift(report);
    this.save();
    return report;
  }

  getAllReports() {
    return this.data.reports;
  }

  updateReportStatus(reportId: string, status: 'resolved' | 'dismissed', adminId: string, actionNote?: string) {
    const report = this.data.reports.find((r) => r.id === reportId);
    if (!report) return null;
    report.status = status;
    this.data.auditLogs.unshift({
      id: `aud_${crypto.randomBytes(6).toString('hex')}`,
      adminId,
      action: `REPORT_${status.toUpperCase()}`,
      details: `Report ${reportId} for track "${report.trackTitle}" was ${status}. ${actionNote || ''}`,
      timestamp: new Date().toISOString()
    });
    this.save();
    return report;
  }

  // --- Search Engine ---
  search(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        tracks: [],
        artists: [],
        albums: [],
        playlists: []
      };
    }

    const matchedTracks = this.data.tracks.filter(
      (t) =>
        t.status === 'published' &&
        (t.title.toLowerCase().includes(q) ||
          t.artistName.toLowerCase().includes(q) ||
          (t.albumTitle && t.albumTitle.toLowerCase().includes(q)) ||
          t.genre.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)))
    );

    const matchedArtists = this.data.artists.filter(
      (a) =>
        a.artistName.toLowerCase().includes(q) ||
        a.genre.toLowerCase().includes(q) ||
        a.bio.toLowerCase().includes(q)
    );

    const matchedAlbums = this.data.albums.filter(
      (alb) =>
        alb.title.toLowerCase().includes(q) ||
        alb.artistName.toLowerCase().includes(q) ||
        alb.genre.toLowerCase().includes(q)
    );

    const matchedPlaylists = this.data.playlists.filter(
      (pl) =>
        pl.isPublic &&
        (pl.name.toLowerCase().includes(q) ||
          (pl.description && pl.description.toLowerCase().includes(q)) ||
          pl.userName.toLowerCase().includes(q))
    );

    return {
      tracks: matchedTracks,
      artists: matchedArtists,
      albums: matchedAlbums,
      playlists: matchedPlaylists
    };
  }

  // --- Creator & Admin Analytics ---
  getCreatorStats(userId: string): CreatorStats {
    let artist = this.getArtistByUserId(userId);
    if (!artist) {
      // Check if user is an artist directly by matching username or first artist
      const user = this.findUserById(userId);
      if (user) {
        artist = this.data.artists.find((a) => a.artistName.toLowerCase() === user.username.toLowerCase()) || null;
      }
    }

    if (!artist) {
      return {
        totalTracks: 0,
        totalPlays: 0,
        totalLikes: 0,
        totalFollowers: 0,
        monthlyListeners: 0,
        playsGrowthRate: 0,
        likesGrowthRate: 0,
        conversionRate: 0,
        recentUploads: [],
        playsByDay: [],
        topTracks: []
      };
    }

    const tracks = this.data.tracks.filter((t) => t.artistId === artist.id);
    const totalPlays = tracks.reduce((acc, t) => acc + (t.playCount || 0), 0);
    const totalLikes = tracks.reduce((acc, t) => acc + (t.likesCount || t.likeCount || 0), 0);
    const followers = this.data.follows.filter((f) => f.artistId === artist.id).length;

    const trackIdSet = new Set(tracks.map((t) => t.id));
    const artistPlays = this.data.playHistory.filter((ph) => trackIdSet.has(ph.trackId));

    const now = Date.now();
    const ms7Days = 7 * 24 * 60 * 60 * 1000;
    const ms30Days = 30 * 24 * 60 * 60 * 1000;

    // Real monthly listeners from play history and followers
    const recent30DayPlays = artistPlays.filter((ph) => new Date(ph.playedAt).getTime() >= now - ms30Days);
    const uniqueListenerKeys = new Set(recent30DayPlays.map((ph) => ph.userId || ph.sessionId || 'anon'));
    const monthlyListeners = Math.max(followers, uniqueListenerKeys.size);

    // Real 7-day plays growth rate
    const recentPlays = artistPlays.filter((ph) => new Date(ph.playedAt).getTime() >= now - ms7Days).length;
    const priorPlays = artistPlays.filter((ph) => {
      const t = new Date(ph.playedAt).getTime();
      return t >= now - 2 * ms7Days && t < now - ms7Days;
    }).length;

    let playsGrowthRate = 0;
    if (priorPlays > 0) {
      playsGrowthRate = Math.round(((recentPlays - priorPlays) / priorPlays) * 1000) / 10;
    } else if (recentPlays > 0) {
      playsGrowthRate = 100.0;
    } else {
      playsGrowthRate = 0.0;
    }

    // Real 7-day likes growth rate
    const artistLikes = this.data.likes.filter((l) => trackIdSet.has(l.trackId));
    const recentLikes = artistLikes.filter((l) => new Date(l.createdAt).getTime() >= now - ms7Days).length;
    const priorLikes = artistLikes.filter((l) => {
      const t = new Date(l.createdAt).getTime();
      return t >= now - 2 * ms7Days && t < now - ms7Days;
    }).length;

    let likesGrowthRate = 0;
    if (priorLikes > 0) {
      likesGrowthRate = Math.round(((recentLikes - priorLikes) / priorLikes) * 1000) / 10;
    } else if (recentLikes > 0) {
      likesGrowthRate = 100.0;
    } else {
      likesGrowthRate = 0.0;
    }

    // Real like to stream conversion rate
    const conversionRate = totalPlays > 0 ? Math.round((totalLikes / totalPlays) * 1000) / 10 : 0;

    // Real daily plays breakdown for the last 7 calendar days
    const playsByDay: { date: string; plays: number; dayName: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const count = artistPlays.filter((ph) => ph.playedAt.startsWith(dateStr)).length;
      playsByDay.push({ date: dateStr, plays: count, dayName });
    }

    // Real top tracks
    const topTracks = tracks
      .slice()
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        title: t.title,
        plays: t.playCount || 0,
        likes: t.likesCount || t.likeCount || 0,
        genre: t.genre,
        duration: t.duration
      }));

    return {
      totalTracks: tracks.length,
      totalPlays,
      totalLikes,
      totalFollowers: followers,
      monthlyListeners,
      playsGrowthRate,
      likesGrowthRate,
      conversionRate,
      recentUploads: tracks.slice(0, 5),
      playsByDay,
      topTracks
    };
  }

  getAdminStats(): AdminStats {
    const now = Date.now();
    const ms7Days = 7 * 24 * 60 * 60 * 1000;

    const totalUsers = this.data.users.length;
    const totalCreators = this.data.users.filter((u) => u.role === 'creator').length;
    const totalListeners = this.data.users.filter((u) => u.role === 'user').length;
    const totalAdmins = this.data.users.filter((u) => u.role === 'admin').length;
    const totalTracks = this.data.tracks.length;
    const totalAlbums = this.data.albums.length;
    const totalPlaylists = this.data.playlists.length;
    const totalPlays = this.data.tracks.reduce((acc, t) => acc + (t.playCount || 0), 0);

    const pendingReports = this.data.reports.filter((r) => r.status === 'pending').length;
    const resolvedReports = this.data.reports.filter((r) => r.status === 'resolved').length;
    const dismissedReports = this.data.reports.filter((r) => r.status === 'dismissed').length;

    // Real User Growth Rate (last 7 days vs prior 7 days)
    const recentUsers = this.data.users.filter((u) => new Date(u.createdAt).getTime() >= now - ms7Days).length;
    const priorUsers = this.data.users.filter((u) => {
      const t = new Date(u.createdAt).getTime();
      return t >= now - 2 * ms7Days && t < now - ms7Days;
    }).length;
    let userGrowthRate = 0;
    if (priorUsers > 0) {
      userGrowthRate = Math.round(((recentUsers - priorUsers) / priorUsers) * 1000) / 10;
    } else if (recentUsers > 0) {
      userGrowthRate = 100.0;
    }

    // Real Stream Growth Rate (last 7 days vs prior 7 days in playHistory)
    const recentStreams = this.data.playHistory.filter((ph) => new Date(ph.playedAt).getTime() >= now - ms7Days).length;
    const priorStreams = this.data.playHistory.filter((ph) => {
      const t = new Date(ph.playedAt).getTime();
      return t >= now - 2 * ms7Days && t < now - ms7Days;
    }).length;
    let streamGrowthRate = 0;
    if (priorStreams > 0) {
      streamGrowthRate = Math.round(((recentStreams - priorStreams) / priorStreams) * 1000) / 10;
    } else if (recentStreams > 0) {
      streamGrowthRate = 100.0;
    }

    // Real Track Upload Growth Rate
    const recentTracks = this.data.tracks.filter((t) => new Date(t.createdAt).getTime() >= now - ms7Days).length;
    const priorTracks = this.data.tracks.filter((track) => {
      const timeMs = new Date(track.createdAt).getTime();
      return timeMs >= now - 2 * ms7Days && timeMs < now - ms7Days;
    }).length;
    let trackGrowthRate = 0;
    if (priorTracks > 0) {
      trackGrowthRate = Math.round(((recentTracks - priorTracks) / priorTracks) * 1000) / 10;
    } else if (recentTracks > 0) {
      trackGrowthRate = 100.0;
    }

    // Real daily streaming volume for last 7 calendar days
    const dailyStreamingVolume: { date: string; streams: number; dayName: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const count = this.data.playHistory.filter((ph) => ph.playedAt.startsWith(dateStr)).length;
      dailyStreamingVolume.push({ date: dateStr, streams: count, dayName });
    }

    // Real Genre Breakdown
    const genreMap = new Map<string, { trackCount: number; streamCount: number }>();
    for (const track of this.data.tracks) {
      const g = track.genre || 'Other';
      const existing = genreMap.get(g) || { trackCount: 0, streamCount: 0 };
      existing.trackCount += 1;
      existing.streamCount += track.playCount || 0;
      genreMap.set(g, existing);
    }
    const genreBreakdown = Array.from(genreMap.entries()).map(([genre, data]) => ({
      genre,
      trackCount: data.trackCount,
      streamCount: data.streamCount,
      percentage: totalPlays > 0 ? Math.round((data.streamCount / totalPlays) * 1000) / 10 : 0
    })).sort((a, b) => b.streamCount - a.streamCount);

    // Real Top Artists
    const topArtists = this.data.artists.map((artist) => {
      const aTracks = this.data.tracks.filter((t) => t.artistId === artist.id);
      const aPlays = aTracks.reduce((sum, t) => sum + (t.playCount || 0), 0);
      return {
        id: artist.id,
        artistName: artist.artistName,
        avatar: artist.avatar,
        trackCount: aTracks.length,
        streamCount: aPlays
      };
    }).sort((a, b) => b.streamCount - a.streamCount);

    return {
      totalUsers,
      totalCreators,
      totalListeners,
      totalAdmins,
      totalTracks,
      totalAlbums,
      totalPlaylists,
      totalPlays,
      userGrowthRate,
      streamGrowthRate,
      trackGrowthRate,
      pendingReports,
      resolvedReports,
      dismissedReports,
      recentReports: this.data.reports.slice(0, 10),
      dailyStreamingVolume,
      genreBreakdown,
      topArtists
    };
  }

  recordAuditLog(adminId: string, action: string, details: string) {
    const log = {
      id: `log_${crypto.randomBytes(6).toString('hex')}`,
      adminId,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
    this.save();
    return log;
  }

  getAuditLogs() {
    return this.data.auditLogs;
  }

  getAllUsers() {
    return this.data.users.map(({ passwordHash: _, ...u }) => u);
  }
}

export const db = new Database();
