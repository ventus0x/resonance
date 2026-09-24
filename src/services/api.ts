import type { User, Artist, Track, Album, Playlist, ContentReport, CreatorStats, AdminStats } from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('resonance_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Discovery & Streaming
  async getTracks(params?: { genre?: string; artistId?: string; albumId?: string }): Promise<{ tracks: Track[] }> {
    const query = new URLSearchParams();
    if (params?.genre) query.set('genre', params.genre);
    if (params?.artistId) query.set('artistId', params.artistId);
    if (params?.albumId) query.set('albumId', params.albumId);
    const res = await fetch(`${API_BASE}/tracks?${query.toString()}`);
    return res.json();
  },

  async getTrending(): Promise<{ tracks: Track[] }> {
    const res = await fetch(`${API_BASE}/trending`);
    return res.json();
  },

  async getNewReleases(): Promise<{ tracks: Track[] }> {
    const res = await fetch(`${API_BASE}/new-releases`);
    return res.json();
  },

  async getTrack(id: string): Promise<{
    track: Track;
    artist: Artist;
    album?: Album;
    moreFromArtist: Track[];
    moreLikeThis: Track[];
  }> {
    const res = await fetch(`${API_BASE}/tracks/${id}`);
    if (!res.ok) throw new Error('Track not found');
    return res.json();
  },

  async getTrackById(id: string) {
    return this.getTrack(id);
  },

  async recordPlay(trackId: string, sessionId: string): Promise<{ success: boolean; counted: boolean; playCount: number; playingNow?: number }> {
    try {
      const res = await fetch(`${API_BASE}/tracks/${trackId}/play`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId })
      });
      return res.json();
    } catch {
      return { success: false, counted: false, playCount: 0 };
    }
  },

  async sendPlaybackHeartbeat(sessionId: string, trackId: string, isPlaying = true): Promise<{ success: boolean; playingNow?: number; totalPlayingNow?: number }> {
    try {
      const res = await fetch(`${API_BASE}/player/heartbeat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId, trackId, isPlaying })
      });
      return res.json();
    } catch {
      return { success: false };
    }
  },

  async stopPlaybackHeartbeat(sessionId: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/player/stop`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId })
      });
      return res.json();
    } catch {
      return { success: false };
    }
  },

  async getPlayingNow(trackId: string): Promise<{ trackId: string; playingNow: number }> {
    const res = await fetch(`${API_BASE}/player/playing-now/${trackId}`);
    return res.json();
  },

  async getArtists(): Promise<{ artists: Artist[] }> {
    const res = await fetch(`${API_BASE}/artists`);
    return res.json();
  },

  async getArtist(id: string): Promise<{
    artist: Artist;
    popularTracks: Track[];
    tracks: Track[];
    albums: Album[];
    singles: Track[];
  }> {
    const res = await fetch(`${API_BASE}/artists/${id}`);
    if (!res.ok) throw new Error('Artist not found');
    return res.json();
  },

  async getArtistById(id: string) {
    return this.getArtist(id);
  },

  async getAlbums(): Promise<{ albums: Album[] }> {
    const res = await fetch(`${API_BASE}/albums`);
    return res.json();
  },

  async getAlbum(id: string): Promise<{ album: Album; tracks: Track[] }> {
    const res = await fetch(`${API_BASE}/albums/${id}`);
    if (!res.ok) throw new Error('Album not found');
    return res.json();
  },

  async getAlbumById(id: string) {
    return this.getAlbum(id);
  },

  async getPlaylists(): Promise<{ playlists: Playlist[] }> {
    const res = await fetch(`${API_BASE}/playlists`);
    return res.json();
  },

  async getPlaylist(id: string): Promise<{ playlist: Playlist & { totalDuration: number; resolvedTracks: Track[] }; tracks?: Track[] }> {
    const res = await fetch(`${API_BASE}/playlists/${id}`);
    if (!res.ok) throw new Error('Playlist not found');
    const data = await res.json();
    return {
      playlist: data.playlist,
      tracks: data.playlist.resolvedTracks || []
    };
  },

  async getPlaylistById(id: string) {
    return this.getPlaylist(id);
  },

  async search(query: string): Promise<{
    tracks: Track[];
    artists: Artist[];
    albums: Album[];
    playlists: Playlist[];
  }> {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  async resolveYouTube(title: string, artist = '', fallback?: string): Promise<{ videoId: string | null; duration: number }> {
    try {
      const q = new URLSearchParams({ title, artist });
      if (fallback) q.set('fallback', fallback);
      const res = await fetch(`${API_BASE}/resolve-youtube?${q.toString()}`);
      if (!res.ok) return { videoId: null, duration: 210 };
      return res.json();
    } catch {
      return { videoId: null, duration: 210 };
    }
  },

  // Reports
  async submitReport(data: {
    trackId: string;
    reason: ContentReport['reason'];
    notes?: string;
  }): Promise<{ success: boolean; report: ContentReport }> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit report');
    }
    return res.json();
  },

  // Auth & Email Verification
  async sendVerificationCode(email: string, purpose: 'register' | 'login' | 'verify_email' = 'register'): Promise<{
    success: boolean;
    message: string;
    email: string;
    code: string;
    expiresAt: number;
  }> {
    const res = await fetch(`${API_BASE}/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to send verification code');
    return result;
  },

  async verifyCode(email: string, code: string, purpose?: string): Promise<{ success: boolean; verified: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, purpose })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Verification failed');
    return result;
  },

  async getEmailOutbox(email?: string): Promise<{ outbox: any[] }> {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`${API_BASE}/auth/email-outbox${query}`);
    return res.json();
  },

  async sendAdminOtp(email: string): Promise<{
    success: boolean;
    message: string;
    email: string;
    code: string;
    expiresAt: number;
    retryAfter?: number;
  }> {
    const res = await fetch(`${API_BASE}/auth/admin/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to send admin OTP');
    return result;
  },

  async loginAdminWithOtp(email: string, code: string): Promise<{ user: User; token: string; message: string }> {
    const res = await fetch(`${API_BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Admin OTP login failed');
    return result;
  },

  async loginWithCode(email: string, code: string) {
    const res = await fetch(`${API_BASE}/auth/login-with-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Login with verification code failed');
    return result;
  },

  async register(data: { username: string; email: string; password: string; role?: 'user' | 'creator'; bio?: string; code?: string }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Registration failed');
    return result;
  },

  async login(data: { email: string; password: string }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Login failed');
    return result;
  },

  async getMe(): Promise<{ user: User | null; artist?: Artist; role: string }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async logout() {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
  },

  // Interactions
  async toggleLike(trackId: string): Promise<{ liked: boolean; likesCount: number }> {
    const res = await fetch(`${API_BASE}/tracks/${trackId}/like`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Action requires authentication');
    return res.json();
  },

  async getUserLikes(): Promise<{ likes: string[]; tracks: Track[] }> {
    const res = await fetch(`${API_BASE}/user/likes`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return { likes: [], tracks: [] };
    return res.json();
  },

  async toggleFollow(artistId: string): Promise<{ followed: boolean; isFollowing: boolean }> {
    const res = await fetch(`${API_BASE}/artists/${artistId}/follow`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Action requires authentication');
    const data = await res.json();
    return {
      followed: data.followed,
      isFollowing: data.followed
    };
  },

  async toggleFollowArtist(artistId: string) {
    return this.toggleFollow(artistId);
  },

  async checkFollowStatus(artistId: string): Promise<{ isFollowing: boolean }> {
    try {
      const res = await this.getUserFollows();
      return { isFollowing: res.follows.includes(artistId) };
    } catch {
      return { isFollowing: false };
    }
  },

  async getUserFollows(): Promise<{ follows: string[]; artists: Artist[] }> {
    const res = await fetch(`${API_BASE}/user/follows`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return { follows: [], artists: [] };
    return res.json();
  },

  // Creator Actions
  async uploadTrack(formData: FormData): Promise<{ success: boolean; track: Track; message: string }> {
    const token = localStorage.getItem('resonance_token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/tracks/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to upload track');
    return result;
  },

  async updateTrack(id: string, updates: Partial<Track>): Promise<{ success: boolean; track: Track }> {
    const res = await fetch(`${API_BASE}/tracks/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update track');
    return res.json();
  },

  async deleteTrack(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/tracks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete track');
    return res.json();
  },

  async createPlaylist(data: { name: string; description?: string; coverUrl?: string; isPublic?: boolean; tracks?: string[] }): Promise<{ success: boolean; playlist: Playlist }> {
    const res = await fetch(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create playlist');
    return res.json();
  },

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<{ success: boolean; playlist: Playlist }> {
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ trackId })
    });
    if (!res.ok) throw new Error('Failed to add track to playlist');
    return res.json();
  },

  async getCreatorStats(): Promise<CreatorStats> {
    const res = await fetch(`${API_BASE}/creator/stats`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load creator stats');
    return res.json();
  },

  // Admin Actions
  async getAdminStats(): Promise<AdminStats> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load admin stats');
    return res.json();
  },

  async getAdminReports(): Promise<{ reports: ContentReport[] }> {
    const res = await fetch(`${API_BASE}/admin/reports`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async getReports() {
    return this.getAdminReports();
  },

  async resolveReport(reportId: string, status: 'resolved' | 'dismissed', hideTrack = false, actionNote?: string) {
    const res = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, hideTrack, actionNote })
    });
    return res.json();
  },

  async updateTrackStatusAdmin(trackId: string, status: Track['status']) {
    const res = await fetch(`${API_BASE}/admin/tracks/${trackId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async getAdminUsers(): Promise<{ users: User[] }> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async toggleSuspendUser(userId: string, isSuspended: boolean) {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/suspend`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isSuspended })
    });
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/admin/audit-logs`, {
      headers: getAuthHeaders()
    });
    return res.json();
  }
};
