import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [inboxCount, setInboxCount] = useState(0);

  // Fetch pending inbox count
  useEffect(() => {
    if (!user) return;

    const fetchInboxCount = async () => {
      try {
        const res = await fetch(`/api/collaborations/inbox?userId=${user.id}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setInboxCount(data.filter(r => r.status === 'pending').length);
        }
      } catch (err) {
        // Silently fail
      }
    };

    fetchInboxCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchInboxCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Refresh count when navigating away from inbox
  useEffect(() => {
    if (!user || location.pathname === '/inbox') return;
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/collaborations/inbox?userId=${user.id}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setInboxCount(data.filter(r => r.status === 'pending').length);
        }
      } catch (err) {}
    };
    fetchCount();
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

  return (
    <nav className="bg-[#0f1419]/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <Link to="/projects" className="flex items-center space-x-3 group">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg group-hover:shadow-blue-500/50 transition-all">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="font-bold text-xl text-white tracking-tight">CollabHub</span>
            </Link>
            <div className="hidden md:flex space-x-2">
              <Link
                to="/projects"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${isActive('/projects')
                  ? 'text-white bg-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
              >
                Feed
              </Link>
              <Link
                to="/search"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${isActive('/search')
                  ? 'text-white bg-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
              >
                Search
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              to="/inbox"
              className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all ${isActive('/inbox')
                ? 'text-white bg-white/10'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Inbox
              </span>
              {inboxCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                  {inboxCount > 9 ? '9+' : inboxCount}
                </span>
              )}
            </Link>
            <Link
              to="/chat"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${isActive('/chat')
                ? 'text-white bg-white/10'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat
              </span>
            </Link>
            <Link
              to={`/profile/${user?.id}`}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${isActive('/profile')
                ? 'text-white bg-white/10'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
