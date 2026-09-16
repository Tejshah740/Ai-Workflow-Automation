import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  RotateCw,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSearch,
  Sparkles,
  ShieldAlert,
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
    isRefreshing,
    fetchNotifications,
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bell size={20} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm">
            Real-time workflow alerts, intake confirmations, and required approval actions.
          </p>
        </div>

       
        <div className="flex items-center gap-2.5">
          <button
            id="notifications-refresh-btn"
            onClick={() => fetchNotifications(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all hover:text-white"
          >
            <RotateCw
              size={14}
              className={isRefreshing ? 'animate-spin text-indigo-400' : ''}
            />
            <span>Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              id="notifications-mark-all-read-btn"
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all"
            >
              <CheckCheck size={15} />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Bell size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.total}
            </div>
            <div className="text-xs text-slate-400">Total Notifications</div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.unread}
            </div>
            <div className="text-xs text-slate-400">Unread Alerts</div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
            <FileSearch size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.actionsNeeded}
            </div>
            <div className="text-xs text-slate-400">Actions Needed</div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.approved}
            </div>
            <div className="text-xs text-slate-400">Approved Submissions</div>
          </div>
        </div>
      </div>

      
      <div className="glass-card p-4 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-full md:w-auto">
            <button
              id="filter-status-all"
              onClick={() => setStatusFilter('all')}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              id="filter-status-unread"
              onClick={() => setStatusFilter('unread')}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'unread'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread ({stats.unread})
            </button>
            <button
              id="filter-status-read"
              onClick={() => setStatusFilter('read')}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'read'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Read ({stats.total - stats.unread})
            </button>
          </div>

          
          <div className="relative w-full md:w-72">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              id="notifications-search-input"
              type="text"
              placeholder="Search notifications or #ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white/[0.03] border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 flex items-center gap-1 pr-1 font-medium">
            <Filter size={12} /> Event:
          </span>
          {EVENT_FILTERS.map((f) => (
            <button
              key={f.value}
              id={`filter-event-${f.value}`}
              onClick={() => setEventFilter(f.value)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                eventFilter === f.value
                  ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/[0.04]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      
      <div className="space-y-3">
        {loading && notifications.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-400 text-sm">
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Sparkles size={24} className="text-indigo-400/80" />
            </div>
            <h3 className="text-base font-semibold text-white">
              No notifications found
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || eventFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters or search query to find what you are looking for.'
                : 'You have no alerts at this time. When workflow events occur, they will appear here.'}
            </p>
            {(searchQuery || eventFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setEventFilter('all');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-1.5 rounded-xl text-xs font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          filtered.map((item) => {
            const meta = getEventMeta(item.event);
            const IconComponent = meta.icon;
            const isUnread = !item.read_at;

            return (
              <div
                key={item.id}
                id={`notification-card-${item.id}`}
                className={`glass-card p-4 sm:p-5 transition-all duration-200 relative overflow-hidden group ${
                  isUnread
                    ? 'border-indigo-500/30 bg-[#0c1433]/70 hover:border-indigo-500/50'
                    : 'border-white/[0.06] hover:border-white/[0.12] opacity-90'
                }`}
              >
                
                {isUnread && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-500" />
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                 
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${meta.bg} ${meta.text} ${meta.border} shadow-sm`}
                    >
                      <IconComponent size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                     
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${meta.bg} ${meta.text} ${meta.border}`}
                        >
                          {meta.label}
                        </span>

                        {item.submission_id && (
                          <span className="text-[11px] font-medium text-slate-300 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Layers size={11} className="text-slate-400" />
                            Submission #{item.submission_id}
                          </span>
                        )}

                        {isUnread ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-300 bg-rose-500/15 border border-rose-500/20 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                            Unread
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 bg-white/[0.02] px-2 py-0.5 rounded-full">
                            Read {formatTimeAgo(item.read_at)}
                          </span>
                        )}

                        <span
                          className="text-[11px] text-slate-400 ml-auto"
                          title={new Date(item.created_at).toLocaleString()}
                        >
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>

                     
                      <p className="text-sm font-medium text-white leading-relaxed">
                        {item.message}
                      </p>

                      <div className="text-[11px] text-slate-500 mt-1">
                        Received: {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  
                  <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.05]">
                    {item.submission_id && (
                      <button
                        onClick={() => handleNavigateToTarget(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all"
                      >
                        <span>
                          {['admin', 'reviewer', 'approver'].includes(
                            user?.role
                          ) &&
                          (item.event === 'needs_review' ||
                            item.event === 'pending_approval')
                            ? 'Open Review'
                            : 'View Submission'}
                        </span>
                        <ArrowRight size={13} />
                      </button>
                    )}

                    {isUnread && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/20 transition-all"
                      >
                        <Check size={13} />
                        <span>Mark read</span>
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
