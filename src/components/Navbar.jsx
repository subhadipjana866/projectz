import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg group-hover:shadow-blue-500/50 transition-all">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="font-bold text-xl text-white tracking-tight">CollabHub</span>
            </Link>
            <div className="hidden md:flex space-x-2">
              <Link
                to="/search"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${isActive('/search')
                  ? 'text-white bg-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
              >
                Search
              </Link>
              <Link
                to="/projects"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${isActive('/projects')
                  ? 'text-white bg-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
              >
                Feed
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
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
