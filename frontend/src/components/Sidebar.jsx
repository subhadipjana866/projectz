import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Logo } from './ui';

const icons = {
  feed: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />,
  search: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />,
  inbox: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  chat: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
  profile: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  logout: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
};

function NavIcon({ name, className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[name]}
    </svg>
  );
}

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [inboxCount, setInboxCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const refreshInboxCount = async () => {
    try {
      const res = await apiFetch(`/api/collaborations/inbox`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setInboxCount(data.filter(r => r.status === 'pending').length);
      }
    } catch (err) {
      // Silently fail
    }
  };

  // Poll pending inbox count, and refresh on navigation
  useEffect(() => {
    if (!user) return;
    refreshInboxCount();
    const interval = setInterval(refreshInboxCount, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user && location.pathname !== '/inbox') refreshInboxCount();
    // Close the mobile menu whenever the route changes
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user]);

  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
      localStorage.removeItem('rememberMeExpiry');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const links = [
    { to: '/projects', match: '/projects', label: 'Feed', icon: 'feed' },
    { to: '/search', match: '/search', label: 'Search', icon: 'search' },
    { to: '/inbox', match: '/inbox', label: 'Inbox', icon: 'inbox', badge: inboxCount },
    { to: '/chat', match: '/chat', label: 'Chat', icon: 'chat' },
    { to: `/profile/${user?.id}`, match: '/profile', label: 'Profile', icon: 'profile' },
  ];

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Member';

  const NavLinks = ({ onNavigate }) => (
    <nav className="flex-1 px-3 space-y-1">
      {links.map(({ to, match, label, icon, badge }) => {
        const active = isActive(match);
        return (
          <Link
            key={label}
            to={to}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${active
              ? 'text-white bg-gradient-to-r from-primary-600/25 to-transparent border border-primary-500/25'
              : 'text-slate-400 border border-transparent hover:text-white hover:bg-white/[0.05]'}`}
          >
            {/* Active indicator bar */}
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-gradient-to-b from-primary-400 to-violet-500 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
            <NavIcon name={icon} className={`w-5 h-5 ${active ? 'text-primary-300' : 'text-slate-500 group-hover:text-slate-300'}`} />
            {label}
            {badge > 0 && (
              <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const UserCard = () => (
    <div className="px-3 pb-4">
      <div className="glass p-3 flex items-center gap-3">
        <Link to={`/profile/${user?.id}`} className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
          {displayName[0]?.toUpperCase()}
        </Link>
        <div className="min-w-0 text-left">
          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
          <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="ml-auto p-2 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition-colors shrink-0"
          title="Log out"
        >
          <NavIcon name="logout" className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop rail ─────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 z-40 flex-col bg-ink-900/70 backdrop-blur-xl border-r border-white/[0.07]">
        <div className="h-20 flex items-center px-6 shrink-0">
          <Logo to="/projects" />
        </div>
        <NavLinks />
        <UserCard />
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-40 h-16 flex items-center justify-between px-4 bg-ink-900/80 backdrop-blur-xl border-b border-white/[0.07]">
        <Logo to="/projects" size="sm" />
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
          {!mobileOpen && inboxCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50 animate-pulse" />
          )}
        </button>
      </header>

      {/* ── Mobile drawer ────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 animate-fade-in" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute inset-y-0 left-0 w-72 bg-ink-900/95 backdrop-blur-xl border-r border-white/10 flex flex-col animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-20 flex items-center px-6 shrink-0">
              <Logo to="/projects" />
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <UserCard />
          </div>
        </div>
      )}
    </>
  );
}
