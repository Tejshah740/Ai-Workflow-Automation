import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  RotateCw,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSearch,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export function getEventMeta(event) {
  switch (event) {
    case 'needs_review':
      return {
        label: 'Review Required',
        icon: FileSearch,
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/20',
        gradient: 'from-amber-500 to-orange-500',
      };
    case 'pending_approval':
      return {
        label: 'Approval Pending',
        icon: Clock,
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-400',
        border: 'border-indigo-500/20',
        gradient: 'from-indigo-500 to-violet-500',
      };
    case 'submission_approved':
      return {
        label: 'Approved',
        icon: CheckCircle2,
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/20',
        gradient: 'from-emerald-500 to-teal-500',
      };
    case 'submission_rejected':
      return {
        label: 'Rejected',
        icon: XCircle,
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/20',
        gradient: 'from-rose-500 to-pink-500',
      };
    case 'submission_failed':
      return {
        label: 'Failed',
        icon: AlertTriangle,
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20',
        gradient: 'from-red-500 to-rose-600',
      };
    default:
      return {
        label: 'Notification',
        icon: Bell,
        bg: 'bg-slate-500/10',
        text: 'text-slate-400',
        border: 'border-slate-500/20',
        gradient: 'from-slate-500 to-slate-700',
      };
  }
}

export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 30) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isRefreshing,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState('all'); 
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredNotifications = notifications.filter((n) => {
    if (tab === 'unread') return !n.read_at;
    return true;
  });

  const handleNotificationClick = (item) => {
    if (!item.read_at) {
      markAsRead(item.id);
    }
    setIsOpen(false);

    if (item.submission_id) {
      if (
        ['admin', 'reviewer', 'approver'].includes(user?.role) &&
        (item.event === 'needs_review' || item.event === 'pending_approval')
      ) {
        navigate(`/workflow/${item.submission_id}`);
      } else {
        navigate(`/submissions/${item.submission_id}`);
      }
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="View notifications"
        className={`relative p-2 rounded-xl transition-all duration-200 border ${
          isOpen
            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/10'
            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.06] text-slate-300 hover:text-white'
        }`}
      >
        <Bell size={18} className={unreadCount > 0 ? 'animate-bell-ring' : ''} />

        {unreadCount > 0 && (
          <span
            id="notification-badge"
            className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md shadow-rose-500/40 animate-pulse"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notification-dropdown"
          className="absolute right-0 mt-2.5 w-84 sm:w-96 rounded-2xl glass-card bg-[#0a1026]/95 border border-white/10 shadow-2xl shadow-black/80 backdrop-blur-2xl z-50 overflow-hidden animate-slide-down"
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white tracking-tight">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="notification-refresh-btn"
                onClick={() => fetchNotifications(true)}
                disabled={isRefreshing}
                title="Refresh notifications"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <RotateCw
                  size={14}
                  className={isRefreshing ? 'animate-spin text-indigo-400' : ''}
                />
              </button>

              {unreadCount > 0 && (
                <button
                  id="notification-mark-all-read-btn"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
                >
                  <CheckCheck size={13} className="text-indigo-400" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="flex px-4 pt-2 border-b border-white/[0.04] bg-white/[0.01]">
            <button
              id="tab-all-notifications"
              onClick={() => setTab('all')}
              className={`pb-2 px-2 text-xs font-medium transition-colors border-b-2 ${
                tab === 'all'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              id="tab-unread-notifications"
              onClick={() => setTab('unread')}
              className={`pb-2 px-2 text-xs font-medium transition-colors border-b-2 ${
                tab === 'unread'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-white/[0.04]">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Sparkles size={20} className="text-indigo-400/80" />
                </div>
                <p className="text-sm font-medium text-white">
                  {tab === 'unread' ? 'All caught up!' : 'No notifications yet'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto">
                  {tab === 'unread'
                    ? 'You have reviewed all your pending alerts.'
                    : 'System events and workflow updates will appear here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const meta = getEventMeta(item.event);
                const IconComponent = meta.icon;
                const isUnread = !item.read_at;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`group relative flex items-start gap-3 p-3.5 transition-all duration-150 cursor-pointer ${
                      isUnread
                        ? 'bg-indigo-500/[0.06] hover:bg-indigo-500/[0.12]'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                   
                    {isUnread && (
                      <span className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                    )}

                    
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${meta.bg} ${meta.text} ${meta.border}`}
                    >
                      <IconComponent size={16} />
                    </div>

                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.bg} ${meta.text} ${meta.border}`}
                        >
                          {meta.label}
                        </span>

                        {item.submission_id && (
                          <span className="text-[10px] font-medium text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Layers size={10} />#{item.submission_id}
                          </span>
                        )}

                        <span className="ml-auto text-[10px] text-slate-500 whitespace-nowrap">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                   
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(item.id);
                        }}
                        title="Mark as read"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all flex-shrink-0"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2.5 border-t border-white/[0.06] bg-white/[0.02] text-center">
            <button
              id="view-all-notifications-btn"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 rounded-xl transition-colors"
            >
              <span>View all notifications</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
