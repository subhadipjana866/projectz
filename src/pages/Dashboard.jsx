import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <>
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl shadow-lg p-8 backdrop-blur-sm">
          <h1 className="text-4xl font-bold text-white mb-2 text-left">
            Welcome, {user?.first_name ? `${user.first_name} ${user.last_name}` : 'User'}!
          </h1>
          <p className="text-lg text-slate-400 mb-8 text-left">
            You're successfully logged in to your account.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stats Cards */}
            {[
              { title: 'Projects', value: '12', icon: '📊' },
              { title: 'Team Members', value: '8', icon: '👥' },
              { title: 'Upcoming Deadlines', value: '3', icon: '📅' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-lg p-6 hover:bg-[rgba(255,255,255,0.05)] transition-all backdrop-blur-sm"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <p className="text-slate-400 text-sm mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h2 className="font-semibold text-blue-300 mb-2">Getting Started</h2>
            <p className="text-blue-200 text-sm">
              Your authentication system is working perfectly! Start building your application.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

