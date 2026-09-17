import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Inbox } from 'lucide-react';
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
        <Loader2 size={24} className="animate-spin text-slate-400 mb-2" />
        <p className="text-xs text-slate-500">Loading queue…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Workflow Queue
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Items awaiting your review or approval
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 mb-6 animate-fade-in">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {showReview && (
          <section>
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Needs Review
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                ({queue.needs_review.length})
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
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Pending Approval
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                ({queue.pending_approval.length})
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
            <Inbox size={32} className="text-slate-400 mb-3" />
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
      className="glass-card p-4 text-left w-full hover:border-slate-300 hover:shadow-sm transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-slate-900 capitalize group-hover:text-slate-700 transition-colors">
            {sub.submission_type?.replace(/_/g, ' ') || 'Unknown'}
          </p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">#{sub.id}</p>
        </div>
        <span className={`status-indicator status-${sub.status}`}>
          <span className="status-dot" />
          {statusLabel(sub.status)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="capitalize">{sub.channel}</span>
        <span>·</span>
        <span>{formatDate(sub.created_at)}</span>
      </div>
    </button>
  );
}

function EmptySection({ message }) {
  return (
    <div className="glass-card flex items-center justify-center py-10 px-6">
      <div className="flex items-center gap-2.5">
        <Inbox size={18} className="text-slate-400" />
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}
