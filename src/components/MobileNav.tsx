import React from 'react';
import { Home, Compass, Search, Library, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MobileNavProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentView, onNavigate }) => {
  const { user, openAuthModal } = useAuth();

  const items = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Library', icon: Library },
    {
      id: 'upload',
      label: 'Upload',
      icon: Upload,
      action: () => {
        if (!user) {
          openAuthModal('Sign in or register to upload and share your music.');
        } else {
          onNavigate('upload');
        }
      }
    }
  ];

  return (
    <nav className="lg:hidden fixed bottom-16 left-0 right-0 z-20 flex h-14 items-center justify-around border-t border-white/10 bg-[#0b0f1a]/95 backdrop-blur-lg px-2 text-xs">
      {items.map((item) => {
        const Icon = item.icon;
        const active = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={item.action || (() => onNavigate(item.id))}
            className={`flex flex-col items-center justify-center gap-1 py-1 transition ${
              active ? 'text-amber-400 font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-[10px]">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
