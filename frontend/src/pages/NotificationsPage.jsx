import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  CheckCheck,
  Search,
  ArrowRight,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { getEventMeta, formatTimeAgo } from '../components/NotificationBell';

const EVENT_FILTERS = [
  { value: 'all', label: 'All Events' },
  { value: 'needs_review', label: 'Review Required' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'submission_approved', label: 'Approved' },
  { value: 'submission_rejected', label: 'Rejected' },
  { value: 'submission_failed', label: 'Failed' },
];

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.read_at).length;
    const actionsNeeded = notifications.filter(
      (n) => n.event === 'needs_review' || n.event === 'pending_approval'
    ).length;
    const approved = notifications.filter(
      (n) => n.event === 'submission_approved'
    ).length;
    return { total, unread, actionsNeeded, approved };
  }, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (statusFilter === 'unread' && n.read_at) return false;
      if (statusFilter === 'read' && !n.read_at) return false;

      if (eventFilter !== 'all' && n.event !== eventFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msgMatch = n.message?.toLowerCase().includes(q);
        const subMatch = n.submission_id?.toString().includes(q);
        const eventMatch = n.event?.toLowerCase().includes(q);
        if (!msgMatch && !subMatch && !eventMatch) return false;
      }

      return true;
    });
  }, [notifications, statusFilter, eventFilter, searchQuery]);

  function handleNavigateToTarget(item) {
    if (!item.read_at) {
      markAsRead(item.id);
    }
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
  }

  function cleanNotificationMessage(msg, event) {
    if (!msg) return { text: '' };
    if (event === 'submission_approved' || /approved/i.test(msg)) {
      return { text: 'Your submission was approved.' };
    }
    if (event === 'submission_rejected' || /rejected/i.test(msg)) {
      const match = msg.match(/(?:Reason|Comment):\s*(.+)$/i);
      return {
        text: 'Your submission was rejected.',
        reason: match ? match[1].trim() : null,
      };
    }
    if (event === 'needs_review' || /needs review/i.test(msg)) {
      return { text: 'A submission requires review.' };
    }
    if (event === 'pending_approval' || /awaiting.*approval/i.test(msg)) {
      return { text: 'A submission is awaiting your approval.' };
    }
    return {
      text: msg
        .replace(/#\d+\s*(?:\([^)]*\))?/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim(),
    };
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time workflow and approval status alerts
          </p>
        </div>

        {stats.unread > 0 && (
          <button
            id="mark-all-read-btn"
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors self-start cursor-pointer"
          >
            <CheckCheck size={14} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-4">
          <span className="text-xs text-slate-500">Total Notifications</span>
          <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{stats.total}</p>
        </div>
        <div className="glass-card p-4">
          <span className="text-xs text-slate-500">Unread Alerts</span>
          <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{stats.unread}</p>
        </div>
        <div className="glass-card p-4">
          <span className="text-xs text-slate-500">Actions Needed</span>
          <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{stats.actionsNeeded}</p>
        </div>
        <div className="glass-card p-4">
          <span className="text-xs text-slate-500">Approved Submissions</span>
          <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{stats.approved}</p>
        </div>
      </div>

      <div className="glass-card p-3 mb-6 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden w-full md:w-auto">
            <button
              id="filter-status-all"
              onClick={() => setStatusFilter('all')}
              className={`flex-1 md:flex-initial px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              id="filter-status-unread"
              onClick={() => setStatusFilter('unread')}
              className={`flex-1 md:flex-initial px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === 'unread'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Unread ({stats.unread})
            </button>
            <button
              id="filter-status-read"
              onClick={() => setStatusFilter('read')}
              className={`flex-1 md:flex-initial px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === 'read'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Read ({stats.total - stats.unread})
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              id="notifications-search-input"
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
          <span className="text-slate-500 text-xs font-medium pr-1">Event:</span>
          {EVENT_FILTERS.map((f) => (
            <button
              key={f.value}
              id={`filter-event-${f.value}`}
              onClick={() => setEventFilter(f.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                eventFilter === f.value
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {loading && notifications.length === 0 ? (
          <div className="glass-card p-10 text-center text-slate-500 text-xs">
            Loading notifications…
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              No notifications found
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {searchQuery || eventFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'You have no alerts at this time.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const meta = getEventMeta(item.event);
            const isUnread = !item.read_at;

            return (
              <div
                key={item.id}
                id={`notification-card-${item.id}`}
                className={`glass-card p-4 transition-colors ${
                  isUnread
                    ? 'border-slate-300 bg-slate-50/60 shadow-xs'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${meta.badge || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>

                        <span className="text-[11px] text-slate-400 ml-auto">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>

                      {(() => {
                        const cleaned = cleanNotificationMessage(item.message, item.event);
                        return (
                          <div className="space-y-1.5">
                            <p className="text-xs text-slate-800 font-medium leading-relaxed">
                              {cleaned.text}
                            </p>
                            {cleaned.reason && (
                              <p className="text-xs text-rose-700 bg-rose-50/70 border border-rose-200/60 rounded px-2.5 py-1.5 inline-block">
                                <span className="font-semibold text-rose-800">Reason:</span> {cleaned.reason}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    {item.submission_id && (
                      <button
                        onClick={() => handleNavigateToTarget(item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer"
                      >
                        <span>
                          {['admin', 'reviewer', 'approver'].includes(user?.role) &&
                          (item.event === 'needs_review' || item.event === 'pending_approval')
                            ? 'Review'
                            : 'View'}
                        </span>
                        <ArrowRight size={11} />
                      </button>
                    )}

                    {isUnread && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <Check size={11} />
                        <span>Read</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
