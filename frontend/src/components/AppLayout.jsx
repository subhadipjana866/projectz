import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen bg-ink-950 text-white font-sans overflow-x-hidden">
      {/* Ambient animated aurora backdrop */}
      <div className="aurora" aria-hidden="true">
        <span className="w-[42rem] h-[42rem] -top-40 -left-40 bg-primary-600/20 animate-float" />
        <span className="w-[38rem] h-[38rem] top-1/3 -right-40 bg-violet-600/15 animate-glow" style={{ animationDelay: '1.5s' }} />
        <span className="w-[32rem] h-[32rem] bottom-0 left-1/3 bg-cyan-500/10 animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <Sidebar />

      {/* Content — offset for the desktop sidebar rail */}
      <div className="relative z-10 lg:pl-64 flex flex-col min-h-screen">
        {/* key on the path re-triggers the entrance animation on every route change */}
        <main key={location.pathname} className="animate-fade-in flex-1 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
