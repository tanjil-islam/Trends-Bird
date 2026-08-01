'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Key, ShieldCheck, Users, Image as ImageIcon, FolderTree, Tags, Settings, Package, X } from 'lucide-react';

const navGroups = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard, permission: null },
    ]
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Products', href: '/products', icon: Package, permission: 'product:read' },
      { label: 'Categories', href: '/categories', icon: FolderTree, permission: 'category:read' },
      { label: 'Brands', href: '/brands', icon: Tags, permission: 'brand:read' },
      { label: 'Attributes', href: '/attributes', icon: Settings, permission: 'attribute:read' },
    ]
  },
  {
    title: 'System',
    items: [
      { label: 'Media', href: '/media', icon: ImageIcon, permission: 'media:read' },
      { label: 'Users', href: '/users', icon: Users, permission: 'user:read' },
      { label: 'Roles', href: '/roles', icon: ShieldCheck, permission: 'role:read' },
      { label: 'Permissions', href: '/permissions', icon: Key, permission: 'permission:read' },
    ]
  }
];

export default function Sidebar({ isOpen, setIsOpen }: { isOpen?: boolean; setIsOpen?: (val: boolean) => void }) {
  const { hasPermission, user } = useAuth();
  const pathname = usePathname();

  const baseClasses = "fixed inset-y-0 left-0 z-40 w-64 bg-[var(--bg-card)] border-r border-[var(--border-color)] flex flex-col transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0";
  const mobileClasses = isOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && setIsOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden transition-opacity" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      <aside className={`${baseClasses} ${mobileClasses}`}>
        <div className="h-14 px-6 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-[var(--text-primary)] text-white p-1 rounded-md shadow-sm">
               <Package size={14} strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Trends Bird
            </span>
          </div>
          {setIsOpen && (
            <button 
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-6 space-y-6">
          {navGroups.map((group, idx) => {
            const visibleItems = group.items.filter(item => !item.permission || hasPermission(item.permission));
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx}>
                <h3 className="px-3 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5" style={{ fontFamily: 'var(--font-sans)' }}>
                  {group.title}
                </h3>
                <nav className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen && setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-5 h-5 ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                          <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-[var(--text-primary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate" style={{ fontFamily: 'var(--font-heading)' }}>{user?.name}</p>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold truncate mt-0.5">{user?.role?.name}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
