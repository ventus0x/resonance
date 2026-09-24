import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AudioPlayerProvider } from './context/AudioPlayerContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Player } from './components/Player';
import { QueueDrawer } from './components/QueueDrawer';

// Modals
import { AuthModal } from './components/modals/AuthModal';
import { ReportModal } from './components/modals/ReportModal';
import { AddToPlaylistModal } from './components/modals/AddToPlaylistModal';
import { LyricsModal } from './components/modals/LyricsModal';
import { FullscreenPlayer } from './components/modals/FullscreenPlayer';

// Views
import { HomeView } from './views/HomeView';
import { DiscoverView } from './views/DiscoverView';
import { SearchView } from './views/SearchView';
import { TrackView } from './views/TrackView';
import { ArtistView } from './views/ArtistView';
import { AlbumView } from './views/AlbumView';
import { PlaylistView } from './views/PlaylistView';
import { LibraryView } from './views/LibraryView';
import { UploadView } from './views/UploadView';
import { CreatorDashboardView } from './views/CreatorDashboardView';
import { AdminView } from './views/AdminView';

export function AppContent() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [viewParams, setViewParams] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Handle URL hash navigation for deep linking & back button support
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) {
        setCurrentView('home');
        setViewParams({});
        return;
      }
      const [view, paramStr] = hash.split('?');
      setCurrentView(view || 'home');
      if (paramStr) {
        const params = Object.fromEntries(new URLSearchParams(paramStr));
        setViewParams(params);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (view: string, params?: any) => {
    setCurrentView(view);
    setViewParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update hash
    if (params && Object.keys(params).length > 0) {
      const query = new URLSearchParams(params).toString();
      window.location.hash = `${view}?${query}`;
    } else {
      window.location.hash = view;
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-black font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Primary Body Layout */}
      <div className="flex-1 flex">
        {/* Left Sidebar on Desktop */}
        <Sidebar currentView={currentView} onNavigate={handleNavigate} />

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 max-w-7xl mx-auto w-full pb-36">
          {currentView === 'home' && <HomeView onNavigate={handleNavigate} />}

          {currentView === 'discover' && (
            <DiscoverView initialGenre={viewParams.genre} onNavigate={handleNavigate} />
          )}

          {currentView === 'search' && (
            <SearchView
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'track' && viewParams.trackId && (
            <TrackView trackId={viewParams.trackId} onNavigate={handleNavigate} />
          )}

          {currentView === 'artist' && viewParams.artistId && (
            <ArtistView artistId={viewParams.artistId} onNavigate={handleNavigate} />
          )}

          {currentView === 'album' && viewParams.albumId && (
            <AlbumView albumId={viewParams.albumId} onNavigate={handleNavigate} />
          )}

          {currentView === 'playlist' && viewParams.playlistId && (
            <PlaylistView playlistId={viewParams.playlistId} onNavigate={handleNavigate} />
          )}

          {currentView === 'library' && <LibraryView onNavigate={handleNavigate} />}

          {currentView === 'upload' && <UploadView onNavigate={handleNavigate} />}

          {currentView === 'creator-dashboard' && (
            <CreatorDashboardView onNavigate={handleNavigate} />
          )}

          {currentView === 'admin' && <AdminView onNavigate={handleNavigate} />}
        </main>
      </div>

      {/* Mobile Navigation Bar */}
      <MobileNav currentView={currentView} onNavigate={handleNavigate} />

      {/* Global Bottom Audio Player */}
      <Player
        onNavigateTrack={(trackId) => handleNavigate('track', { trackId })}
        onNavigateArtist={(artistId) => handleNavigate('artist', { artistId })}
      />

      {/* Modals & Drawers */}
      <QueueDrawer />
      <AuthModal onNavigate={handleNavigate} />
      <ReportModal />
      <AddToPlaylistModal />
      <LyricsModal />
      <FullscreenPlayer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AudioPlayerProvider>
        <AppContent />
      </AudioPlayerProvider>
    </AuthProvider>
  );
}
