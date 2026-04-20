import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#101622] text-white font-sans">
      <Navbar />
      <Outlet />
    </div>
  );
}
