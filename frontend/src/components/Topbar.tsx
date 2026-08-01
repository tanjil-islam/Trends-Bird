'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Menu } from 'lucide-react';

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-1.5 -ml-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="text-[15px] font-bold text-[var(--text-primary)] hidden sm:block tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
          Trends Bird
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-[13px] text-[var(--text-secondary)] hidden sm:inline">
          <span className="text-[var(--text-primary)] font-semibold">{user?.name}</span>
        </span>
        <div className="h-4 w-px bg-[var(--border-color)] mx-1 hidden sm:block"></div>
        <button 
          onClick={logout} 
          className="btn btn-ghost text-[var(--text-secondary)] hover:text-red-700 px-2 py-1.5 h-8 gap-2 border-transparent hover:bg-red-50"
        >
          <LogOut size={14} strokeWidth={2.5} />
          <span className="hidden sm:inline text-xs font-semibold">Log out</span>
        </button>
      </div>
    </header>
  );
}
