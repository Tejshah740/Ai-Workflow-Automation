import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export function getEventMeta(event) {
  switch (event) {
    case 'needs_review':
      return {
        label: 'Review Required',
        dot: 'bg-amber-400',
      };
    case 'pending_approval':
      return {
        label: 'Approval Pending',
        dot: 'bg-purple-400',
      };
    case 'submission_approved':
      return {
        label: 'Approved',
        dot: 'bg-emerald-400',
      };
    case 'submission_rejected':
      return {
        label: 'Rejected',
        dot: 'bg-rose-400',
      };
    case 'submission_failed':
      return {
        label: 'Failed',
        dot: 'bg-red-400',
      };
    default:
      return {
        label: 'Notification',
        dot: 'bg-slate-400',
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
        className={`relative p-2 rounded-lg transition-colors border cursor-pointer ${
          isOpen
            ? 'bg-slate-100 border-slate-300 text-slate-900'
            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`}
      >
        <Bell size={16} className={unreadCount > 0 ? 'animate-bell-ring' : ''} />

        {unreadCount > 0 && (
          <span
            id="notification-badge"
            className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notification-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden animate-slide-down"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">
                  ({unreadCount} new)
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                id="notification-mark-all-read-btn"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          <div className="flex px-4 border-b border-slate-200">
            <button
              id="tab-all-notifications"
              onClick={() => setTab('all')}
              className={`py-2 px-2 text-xs font-medium transition-colors border-b-2 cursor-pointer ${
                tab === 'all'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              id="tab-unread-notifications"
              onClick={() => setTab('unread')}
              className={`py-2 px-2 text-xs font-medium transition-colors border-b-2 cursor-pointer ${
                tab === 'unread'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <p className="text-xs font-medium text-slate-700">
                  {tab === 'unread' ? 'All caught up' : 'No notifications'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {tab === 'unread'
                    ? 'You have reviewed all pending alerts.'
                    : 'System events will appear here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const meta = getEventMeta(item.event);
                const isUnread = !item.read_at;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`group relative flex items-start gap-2.5 p-3 transition-colors cursor-pointer ${
                      isUnread
                        ? 'bg-slate-50/80 hover:bg-slate-100/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} mt-1.5 flex-shrink-0`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-medium text-slate-900">
                          {meta.label}
                        </span>

                        {item.submission_id && (
                          <span className="text-[10px] font-mono text-slate-400">
                            #{item.submission_id}
                          </span>
                        )}

                        <span className="ml-auto text-[10px] text-slate-400">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-normal">
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
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-900 transition-opacity flex-shrink-0 cursor-pointer"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-slate-200 text-center">
            <button
              id="view-all-notifications-btn"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="flex items-center justify-center gap-1.5 w-full py-1 text-xs text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <span>View all notifications</span>
              <ExternalLink size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
