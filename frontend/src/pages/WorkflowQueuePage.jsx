import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  RefreshCw,
  Inbox,
  FileText,
  Send,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-react';
import { getQueue } from '../api/workflow';
import { useAuth } from '../context/AuthContext';

export default function WorkflowQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState({ needs_review: [], pending_approval: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getQueue();
      setQueue(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const showReview = ['admin', 'reviewer'].includes(user?.role);
  const showApproval = ['admin', 'approver'].includes(user?.role);

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const statusLabel = (s) => s?.replace(/_/g, ' ') || '';

  if (loading && queue.needs_review.length === 0 && queue.pending_approval.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-indigo-400 mb-3" />
        <p className="text-sm text-slate-500">Loading queue…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Workflow Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Items awaiting your review or approval
          </p>
        </div>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12] rounded-xl px-4 py-2 transition-all duration-200 hover:bg-white/[0.04]"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 mb-6 animate-fade-in">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {showReview && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck size={18} className="text-amber-400" />
              <h2 className="text-lg font-semibold text-white">
                Needs Review
              </h2>
              <span className="text-xs text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-full ml-1">
                {queue.needs_review.length}
              </span>
            </div>
            {queue.needs_review.length === 0 ? (
              <EmptySection message="No submissions need review right now." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {queue.needs_review.map((sub) => (
                  <QueueCard
                    key={sub.id}
                    submission={sub}
                    formatDate={formatDate}
                    statusLabel={statusLabel}
                    onClick={() => navigate(`/workflow/${sub.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {showApproval && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-violet-400" />
              <h2 className="text-lg font-semibold text-white">
                Pending Approval
              </h2>
              <span className="text-xs text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-full ml-1">
                {queue.pending_approval.length}
              </span>
            </div>
            {queue.pending_approval.length === 0 ? (
              <EmptySection message="No submissions are pending your approval." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {queue.pending_approval.map((sub) => (
                  <QueueCard
                    key={sub.id}
                    submission={sub}
                    formatDate={formatDate}
                    statusLabel={statusLabel}
                    onClick={() => navigate(`/workflow/${sub.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {!showReview && !showApproval && (
          <div className="glass-card flex flex-col items-center justify-center py-16 px-6 text-center">
            <Inbox size={32} className="text-slate-600 mb-3" />
            <p className="text-sm text-slate-500">
              Your role doesn&apos;t have workflow queue access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function QueueCard({ submission, formatDate, statusLabel, onClick }) {
  const sub = submission;
  return (
    <button
      onClick={onClick}
      className="glass-card p-4 text-left w-full hover:bg-white/[0.02] transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <p className="text-sm font-medium text-white capitalize group-hover:text-indigo-300 transition-colors">
            {sub.submission_type?.replace(/_/g, ' ') || 'Unknown'}
          </p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">#{sub.id}</p>
        </div>
        <span className={`status-badge status-${sub.status}`}>
          {statusLabel(sub.status)}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span
          className={`status-badge ${
            sub.channel === 'document' ? 'channel-document' : 'channel-request'
          }`}
        >
          {sub.channel === 'document' ? (
            <FileText size={10} />
          ) : (
            <Send size={10} />
          )}
          {sub.channel}
        </span>
        <span>{formatDate(sub.created_at)}</span>
      </div>
    </button>
  );
}

function EmptySection({ message }) {
  return (
    <div className="glass-card flex items-center justify-center py-10 px-6">
      <div className="flex items-center gap-3">
        <Inbox size={20} className="text-slate-600" />
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}
