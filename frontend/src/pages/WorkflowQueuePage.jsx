import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Inbox, FileText, ArrowRight } from 'lucide-react';
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
  const showApproval = ['admin', 'approver', 'reviewer'].includes(user?.role);

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Needs Review
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                  {queue.needs_review.length}
                </span>
              </div>
            </div>
            {queue.needs_review.length === 0 ? (
              <EmptySection message="No submissions need review right now." />
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {queue.needs_review.map((sub) => (
                    <QueueRow
                      key={sub.id}
                      submission={sub}
                      formatDate={formatDate}
                      statusLabel={statusLabel}
                      actionLabel="Review"
                      onClick={() => navigate(`/workflow/${sub.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {showApproval && (
          <section>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Pending Approval
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
                  {queue.pending_approval.length}
                </span>
              </div>
            </div>
            {queue.pending_approval.length === 0 ? (
              <EmptySection message="No submissions are pending your approval." />
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {queue.pending_approval.map((sub) => (
                    <QueueRow
                      key={sub.id}
                      submission={sub}
                      formatDate={formatDate}
                      statusLabel={statusLabel}
                      actionLabel="Approve"
                      onClick={() => navigate(`/workflow/${sub.id}`)}
                    />
                  ))}
                </div>
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

function QueueRow({ submission, formatDate, statusLabel, actionLabel, onClick }) {
  const sub = submission;
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3.5 sm:p-4 sm:px-5 hover:bg-slate-50/70 transition-colors cursor-pointer group gap-3"
    >
      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors flex-shrink-0">
          <FileText size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900 capitalize group-hover:text-slate-700 transition-colors truncate">
              {sub.submission_type?.replace(/_/g, ' ') || 'Unknown'}
            </p>
            <span className={`status-indicator status-${sub.status} flex-shrink-0`}>
              <span className="status-dot" />
              {statusLabel(sub.status)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 truncate">
            <span className="capitalize flex-shrink-0">{sub.channel}</span>
            <span className="text-slate-300 flex-shrink-0">•</span>
            {(sub.submitter_name || sub.submitter_id) && (
              <>
                <span className="hidden sm:inline text-slate-700 font-medium truncate">by {sub.submitter_name || `User #${sub.submitter_id}`}</span>
                <span className="hidden sm:inline text-slate-300">•</span>
              </>
            )}
            <span className="whitespace-nowrap">{formatDate(sub.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 group-hover:border-slate-300 shadow-2xs transition-all">
          <span>{actionLabel}</span>
          <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  );
}

function EmptySection({ message }) {
  return (
    <div className="glass-card flex items-center justify-center py-8 px-6 text-center">
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        <Inbox size={16} className="text-slate-400" />
        <span>{message}</span>
      </div>
    </div>
  );
}
