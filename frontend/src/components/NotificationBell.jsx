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
        dot: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'pending_approval':
      return {
        label: 'Approval Pending',
        dot: 'bg-purple-500',
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    case 'submission_approved':
      return {
        label: 'Approved',
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'submission_rejected':
      return {
        label: 'Rejected',
        dot: 'bg-rose-500',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'submission_failed':
      return {
        label: 'Failed',
        dot: 'bg-red-500',
        badge: 'bg-red-50 text-red-700 border-red-200',
      };
    default:
      return {
        label: 'Notification',
        dot: 'bg-slate-400',
        badge: 'bg-slate-50 text-slate-700 border-slate-200',
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

  function cleanNotificationMessage(msg, event) {
    if (!msg) return '';
    if (event === 'submission_approved' || /approved/i.test(msg)) {
      return 'Your submission was approved.';
    }
    if (event === 'submission_rejected' || /rejected/i.test(msg)) {
      const match = msg.match(/(?:Reason|Comment):\s*(.+)$/i);
      return match ? `Your submission was rejected. Reason: ${match[1]}` : 'Your submission was rejected.';
    }
    if (event === 'needs_review' || /needs review/i.test(msg)) {
      return 'A submission requires review.';
    }
    if (event === 'pending_approval' || /awaiting.*approval/i.test(msg)) {
      return 'A submission is awaiting your approval.';
    }
    return msg
      .replace(/#\d+\s*(?:\([^)]*\))?/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

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
                id="popover-mark-all-read"
                onClick={markAllAsRead}
                className="text-[11px] text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="flex border-b border-slate-200 px-4 gap-4 text-xs">
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${meta.badge || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>

                        <span className="ml-auto text-[10px] text-slate-400">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 line-clamp-2 leading-normal">
                        {cleanNotificationMessage(item.message, item.event)}
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
