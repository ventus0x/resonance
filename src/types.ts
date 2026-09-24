export type UserRole = 'anonymous' | 'user' | 'creator' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  createdAt: string;
  isSuspended?: boolean;
  emailVerified?: boolean;
}

export interface EmailOutboxItem {
  id: string;
  to: string;
  subject: string;
  code: string;
  purpose: 'register' | 'login' | 'verify_email';
  sentAt: string;
  bodyText: string;
  status: 'delivered';
}

export interface Artist {
  id: string;
  userId?: string;
  artistName: string;
  bio: string;
  avatar: string;
  banner?: string;
  genre: string;
  monthlyListeners: number;
  followerCount?: number;
  followersCount?: number;
  verified: boolean;
  createdAt: string;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  albumId?: string;
  albumTitle?: string;
  audioUrl: string;
  coverUrl: string;
  duration: number; // in seconds
  genre: string;
  description?: string;
  lyrics?: string;
  playCount: number;
  likesCount: number;
  likeCount?: number;
  playingNow?: number;
  releaseDate: string;
  status: 'published' | 'draft' | 'unlisted' | 'hidden';
  isExplicit?: boolean;
  isPermanentPublic?: boolean;
  uploadedByUserId?: string;
  waveform?: number[];
  source?: 'local' | 'youtube' | 'upload';
  youtubeId?: string;
  youtubeUrl?: string;
  createdAt: string;
}

export interface Album {
  id: string;
  artistId: string;
  artistName: string;
  title: string;
  description?: string;
  coverUrl: string;
  releaseDate: string;
  genre: string;
  trackCount: number;
  duration: number;
  tracks?: Track[];
}

export interface Playlist {
  id: string;
  userId: string;
  userName: string;
  name: string;
  description?: string;
  coverUrl: string;
  isPublic: boolean;
  trackCount: number;
  tracks: string[]; // Track IDs
  createdAt: string;
}

export interface ContentReport {
  id: string;
  reporterId?: string;
  reporterName?: string;
  trackId: string;
  trackTitle: string;
  artistName: string;
  reason: 'copyright' | 'spam' | 'offensive' | 'impersonation' | 'illegal' | 'other';
  notes?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface CreatorStats {
  totalTracks: number;
  totalPlays: number;
  totalLikes: number;
  totalFollowers: number;
  monthlyListeners: number;
  playsGrowthRate: number;
  likesGrowthRate: number;
  conversionRate: number;
  recentUploads: Track[];
  playsByDay: { date: string; plays: number; dayName?: string }[];
  topTracks: { id?: string; title: string; plays: number; likes: number; genre?: string; duration?: number }[];
}

export interface AdminStats {
  totalUsers: number;
  totalCreators: number;
  totalListeners: number;
  totalAdmins: number;
  totalTracks: number;
  totalAlbums: number;
  totalPlaylists: number;
  totalPlays: number;
  userGrowthRate: number;
  streamGrowthRate: number;
  trackGrowthRate: number;
  pendingReports: number;
  resolvedReports: number;
  dismissedReports: number;
  recentReports: ContentReport[];
  dailyStreamingVolume?: { date: string; streams: number; dayName?: string }[];
  genreBreakdown?: { genre: string; trackCount: number; streamCount: number; percentage: number }[];
  topArtists?: { id: string; artistName: string; avatar: string; trackCount: number; streamCount: number }[];
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
}
