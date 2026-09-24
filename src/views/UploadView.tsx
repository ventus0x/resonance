import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  X,
  Sparkles,
  Link as LinkIcon,
  Globe,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface UploadViewProps {
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
  'Ambient',
  'Synthwave',
  'Jazz',
  'Metal',
  'Country',
  'Podcast / Spoken'
];

export const UploadView: React.FC<UploadViewProps> = ({ onNavigate }) => {
  const { user, openAuthModal } = useAuth();

  // Mode: 'file' or 'url'
  const [inputMode, setInputMode] = useState<'file' | 'url'>('file');

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrlInput, setAudioUrlInput] = useState('');
  const [detectedDuration, setDetectedDuration] = useState<number>(0);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [coverUrlInput, setCoverUrlInput] = useState('');

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Electronic');
  const [albumTitle, setAlbumTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [isExplicit, setIsExplicit] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [successTrackId, setSuccessTrackId] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // If user is not logged in, prompt sign in with email and password
  if (!user) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
          <Upload className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-white">Upload Any Song</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Sign in to upload any music track, remix, or audio file. Uploads are stored permanently and made public forever until you or an admin delete them.
        </p>
        <button
          onClick={() => openAuthModal('Sign in with your email and password to upload music on Resonance.')}
          className="rounded-xl bg-amber-400 px-6 py-2.5 text-xs font-bold text-black hover:bg-amber-300 transition cursor-pointer"
        >
          Sign In to Upload
        </button>
      </div>
    );
  }

  // Handle any audio file selection
  const handleAudioSelect = (file: File) => {
    setError('');
    setAudioFile(file);

    // Auto-detect duration from file
    try {
      const objectUrl = URL.createObjectURL(file);
      const tempAudio = new Audio();
      tempAudio.src = objectUrl;
      tempAudio.onloadedmetadata = () => {
        if (tempAudio.duration && isFinite(tempAudio.duration)) {
          setDetectedDuration(Math.round(tempAudio.duration));
        }
        URL.revokeObjectURL(objectUrl);
      };
      tempAudio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
      };
    } catch {
      // Fallback duration handled on server
    }

    if (!title) {
      // Pre-fill title from clean filename
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleAudioUrlChange = (val: string) => {
    setAudioUrlInput(val);
    setError('');
    if (val.trim()) {
      try {
        const tempAudio = new Audio();
        tempAudio.src = val.trim();
        tempAudio.onloadedmetadata = () => {
          if (tempAudio.duration && isFinite(tempAudio.duration)) {
            setDetectedDuration(Math.round(tempAudio.duration));
          }
        };
      } catch {
        // Ignored
      }
      if (!title) {
        try {
          const pathname = new URL(val).pathname;
          const filename = pathname.split('/').pop() || '';
          if (filename) {
            const cleanName = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
            setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
          }
        } catch {
          // Ignored
        }
      }
    }
  };

  const handleCoverSelect = (file: File) => {
    setError('');
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inputMode === 'file' && !audioFile) {
      setError('Please select an audio file to upload.');
      return;
    }
    if (inputMode === 'url' && !audioUrlInput.trim()) {
      setError('Please insert an audio stream or file URL.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a song title.');
      return;
    }

    // No copyright blocks or errors! Any song or audio file is allowed.
    setError('');
    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      if (inputMode === 'file' && audioFile) {
        formData.append('audio', audioFile);
      } else if (inputMode === 'url' && audioUrlInput.trim()) {
        formData.append('audioUrl', audioUrlInput.trim());
      }

      if (coverFile) {
        formData.append('cover', coverFile);
      } else if (coverUrlInput.trim()) {
        formData.append('coverUrl', coverUrlInput.trim());
      }

      formData.append('title', title.trim());
      formData.append('genre', genre);
      if (albumTitle.trim()) {
        formData.append('albumTitle', albumTitle.trim());
      }
      if (lyrics.trim()) {
        formData.append('lyrics', lyrics.trim());
      }
      if (detectedDuration > 0) {
        formData.append('duration', detectedDuration.toString());
      }
      formData.append('isExplicit', isExplicit.toString());
      // Explicitly mark copyright/public consent without error
      formData.append('copyrightConfirmed', 'true');

      // Progress animation
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? prev : prev + 15));
      }, 250);

      const res = await api.uploadTrack(formData);
      clearInterval(progressTimer);
      setUploadProgress(100);
      setSuccessTrackId(res.track.id);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (successTrackId) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-400 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Song Published Successfully!</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Your track is now live across Resonance, ready for streaming and inclusion in trending charts.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Globe className="h-3.5 w-3.5" />
            <span>Public Forever (Only you or admin can delete)</span>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={() => onNavigate('track', { trackId: successTrackId })}
            className="rounded-xl bg-amber-400 px-6 py-2.5 text-xs font-bold text-black hover:bg-amber-300 transition cursor-pointer"
          >
            Play & View Song
          </button>
          <button
            onClick={() => {
              setSuccessTrackId(null);
              setAudioFile(null);
              setAudioUrlInput('');
              setCoverFile(null);
              setCoverPreview('');
              setCoverUrlInput('');
              setTitle('');
              setAlbumTitle('');
              setLyrics('');
              setDetectedDuration(0);
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
          >
            Upload Another Song
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-emerald-400 mb-1">
          <Globe className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Universal Music Upload</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Upload Any Audio File</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Upload any song, beat, remix, or spoken audio. No copyright errors or blocks — your music is stored and public forever until you or an admin delete it.
        </p>
      </div>

      {/* Reassurance Banner */}
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-300 space-y-1">
          <span className="font-semibold text-white block">Open Audio Upload Policy</span>
          <p className="leading-relaxed text-zinc-400">
            Resonance allows all users to insert and publish any audio file (MP3, WAV, FLAC, M4A, OGG, AAC, WebM, OPUS, AIFF) up to 300MB, or insert direct audio links. Zero copyright lockouts.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Audio Source Choice (File vs Direct URL) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              1. Insert Audio Master *
            </label>
            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setInputMode('file')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  inputMode === 'file'
                    ? 'bg-amber-400 text-black shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setInputMode('url')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  inputMode === 'url'
                    ? 'bg-amber-400 text-black shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Audio URL / Stream
              </button>
            </div>
          </div>

          {inputMode === 'file' ? (
            <div>
              <input
                type="file"
                ref={audioInputRef}
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.webm,.opus,.wma,.aiff,*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAudioSelect(e.target.files[0])}
              />

              {!audioFile ? (
                <div
                  onClick={() => audioInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) handleAudioSelect(e.dataTransfer.files[0]);
                  }}
                  className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] p-8 text-center hover:border-emerald-400/50 hover:bg-white/[0.04] transition cursor-pointer"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
                    <FileAudio className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    Drag & drop any song or audio file, or <span className="text-emerald-400 underline">browse</span>
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    MP3, WAV, FLAC, M4A, OGG, AAC, WebM, OPUS, AIFF up to 300MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-black">
                      <FileAudio className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{audioFile.name}</p>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                        <span>{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                        {detectedDuration > 0 && (
                          <span className="flex items-center gap-1 text-emerald-400 font-mono">
                            <Clock className="h-3 w-3" />
                            {Math.floor(detectedDuration / 60)}:{(detectedDuration % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                        <span>• Ready to stream</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioFile(null);
                      setDetectedDuration(0);
                    }}
                    className="rounded-full p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="url"
                  value={audioUrlInput}
                  onChange={(e) => handleAudioUrlChange(e.target.value)}
                  placeholder="https://example.com/audio.mp3 (Direct audio link or stream URL)"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                You can insert any direct audio URL (.mp3, .wav, .m4a, live web stream, or hosted audio link).
              </p>
            </div>
          )}
        </div>

        {/* 2. Cover Artwork */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
            2. Cover Artwork (Optional)
          </label>
          <input
            type="file"
            ref={coverInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleCoverSelect(e.target.files[0])}
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div
              onClick={() => coverInputRef.current?.click()}
              className="relative aspect-square w-28 rounded-2xl overflow-hidden border border-dashed border-white/20 bg-white/[0.03] flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-400/50 transition group shrink-0"
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
              ) : (
                <>
                  <ImageIcon className="h-6 w-6 text-zinc-500 group-hover:text-emerald-400 transition" />
                  <span className="text-[10px] text-zinc-400 mt-1">Upload Art</span>
                </>
              )}
            </div>

            <div className="flex-1 space-y-2 text-xs text-zinc-400">
              <p className="text-white font-medium">Add album or single artwork</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Click the square to pick any image (JPG, PNG, WebP). Or paste an image URL below. If omitted, high-res abstract artwork is generated automatically.
              </p>
              <input
                type="url"
                value={coverUrlInput}
                onChange={(e) => setCoverUrlInput(e.target.value)}
                placeholder="Or paste cover image URL (https://...)"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. Metadata Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Song / Track Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midnight Horizon"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Genre *</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0f1422] px-3.5 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
              >
                {GENRES.map((g) => (
                  <option key={`genre-opt-${g}`} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Album / EP (Optional)
              </label>
              <input
                type="text"
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                placeholder="Leave blank for Single"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Lyrics (Optional)
            </label>
            <textarea
              rows={4}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste song lyrics or notes here. Listeners will be able to follow along in real-time..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isExplicit}
              onChange={(e) => setIsExplicit(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-400"
            />
            <span className="text-xs text-zinc-300">Mark as Explicit Content (18+)</span>
          </label>
        </div>

        {/* 4. Public Forever Info */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Public Forever Retention</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Uploaded music remains live permanently across Resonance until you (the uploader) or an admin delete it.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Submit Button */}
        <div>
          {isUploading && (
            <div className="mb-3 space-y-1">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span>Transcoding & Publishing Audio...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 py-3.5 text-sm font-bold text-black shadow-xl shadow-emerald-500/25 hover:from-emerald-300 hover:to-teal-300 transition disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? 'Publishing Audio...' : 'Publish Audio Track (Public Forever)'}
          </button>
        </div>
      </form>
    </div>
  );
};
