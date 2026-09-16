import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Zap,
  LogOut,
  LayoutDashboard,
  FileText,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/submissions', label: 'Submissions', icon: FileText },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen relative flex">
      <div className="bg-scene" />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

     
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64 flex flex-col
          border-r border-white/[0.05] bg-[#070d1f]/90 backdrop-blur-xl
          transition-transform duration-300 ease-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.05] flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">
            AI Workflows
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-slate-500 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-300 shadow-sm shadow-indigo-500/5'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/[0.05] px-3 py-4 flex-shrink-0">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">
                {user?.email}
              </p>
              <p className="text-[10px] text-slate-500 capitalize">
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
            id="sidebar-logout"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

     
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        
        <header className="lg:hidden flex items-center h-14 px-4 border-b border-white/[0.05] bg-[#070d1f]/80 backdrop-blur-lg sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white transition-colors"
            id="mobile-menu-toggle"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/20">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white">
              AI Workflows
            </span>
          </div>
        </header>


        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
