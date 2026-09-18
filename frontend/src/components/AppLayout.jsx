import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationBell from './NotificationBell';
import {
  LogOut,
  LayoutDashboard,
  FileText,
  Menu,
  X,
  GitPullRequestArrow,
  Settings,
  Bell,
} from 'lucide-react';
import { useState, useMemo } from 'react';

const allNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { to: '/submissions', label: 'Submissions', icon: FileText, roles: null },
  { to: '/workflow', label: 'Workflow Queue', icon: GitPullRequestArrow, roles: ['admin', 'reviewer', 'approver'] },
  { to: '/rules', label: 'Rules', icon: Settings, roles: ['admin'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: null, showBadge: true },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = useMemo(
    () => allNavItems.filter((item) => !item.roles || item.roles.includes(user?.role)),
    [user?.role]
  );

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen relative flex bg-[#f8fafc] text-slate-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64 flex flex-col
          border-r border-slate-200 bg-white
          transition-transform duration-300 ease-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-200 flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center">
            <span className="text-xs font-bold text-white">W</span>
          </div>
          <span className="text-sm font-semibold text-slate-900 tracking-tight">
            AI Workflows
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-slate-400 hover:text-slate-700 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, showBadge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150
                ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {showBadge && unreadCount > 0 && (
                <span
                  id="sidebar-unread-badge"
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-3 py-4 flex-shrink-0">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold flex-shrink-0">
              {(user?.name || user?.email)?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-900 truncate">
                {user?.name || user?.email}
              </p>
              <p className="text-[11px] text-slate-500 capitalize">
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            id="sidebar-logout"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-500 hover:text-slate-900 transition-colors"
              id="mobile-menu-toggle"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold text-slate-900">
              AI Workflows
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <header className="hidden lg:flex items-center justify-between h-14 px-8 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
          <div />

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5 text-xs">
              <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs">
                {(user?.name || user?.email)?.charAt(0).toUpperCase() || '?'}
              </div>
              <span className="font-medium text-slate-800">{user?.name || user?.email}</span>
              <span className="text-[11px] capitalize text-slate-500">
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
