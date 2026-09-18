import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Trash2,
} from 'lucide-react';
import { listSubmissions, deleteSubmission } from '../api/submissions';
import { useAuth } from '../context/AuthContext';
import NewSubmissionModal from '../components/NewSubmissionModal';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'ai_processing', label: 'AI Processing' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'failed', label: 'Failed' },
];

const CHANNELS = [
  { value: '', label: 'All' },
  { value: 'document', label: 'Documents' },
  { value: 'request', label: 'Requests' },
];

const PAGE_SIZE = 20;

export default function SubmissionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [offset, setOffset] = useState(0);

  const canDelete = (sub) => {
    if (user?.role === 'admin') return true;
    return sub.submitter_id === user?.id || !sub.submitter_id;
  };

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm(`Delete submission #${id}? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    setError('');
    setDeleteSuccess('');
    try {
      await deleteSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setDeleteSuccess(`Submission #${id} deleted successfully.`);
      setTimeout(() => setDeleteSuccess(''), 3500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete submission.');
    } finally {
      setDeletingId(null);
    }
  }

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listSubmissions({
        status: statusFilter || undefined,
        channel: channelFilter || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setSubmissions(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter, offset]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    setOffset(0);
  }, [statusFilter, channelFilter]);

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const statusLabel = (s) => s.replace(/_/g, ' ');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Submissions
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your documents and requests
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-gradient flex items-center gap-2 text-sm h-9 px-4 self-start"
          id="new-submission-btn"
        >
          <Plus size={15} />
          New Submission
        </button>
      </div>

      <div className="glass-card p-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-slate-900 transition-colors cursor-pointer"
              id="status-filter"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
            {CHANNELS.map((ch) => (
              <button
                key={ch.value}
                onClick={() => setChannelFilter(ch.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  channelFilter === ch.value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {deleteSuccess && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 mb-6 animate-fade-in flex items-center justify-between">
          <span>{deleteSuccess}</span>
          <button
            onClick={() => setDeleteSuccess('')}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6 animate-fade-in">
          {error}
        </div>
      )}

      {loading && submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-400 mb-2" />
          <p className="text-xs text-slate-500">Loading submissions…</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <Inbox size={32} className="text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            No submissions yet
          </h3>
          <p className="text-sm text-slate-500 mb-5 max-w-sm">
            Upload a document or submit a request to get started with AI-powered processing.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-gradient flex items-center gap-2 text-sm h-9 px-4"
          >
            <Plus size={15} />
            Create your first submission
          </button>
        </div>
      ) : (
        <>
          <div className="hidden sm:block glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-600 px-4 py-3 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => navigate(`/submissions/${sub.id}`)}
                    className="border-b border-slate-100 hover:bg-slate-50/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium capitalize">
                      {sub.submission_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 capitalize">
                      {sub.channel}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-indicator status-${sub.status}`}>
                        <span className="status-dot" />
                        {statusLabel(sub.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 font-medium whitespace-nowrap">
                      {sub.submitter_name || (sub.submitter_id ? `User #${sub.submitter_id}` : '—')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(sub.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {canDelete(sub) ? (
                        <button
                          onClick={(e) => handleDelete(e, sub.id)}
                          disabled={deletingId === sub.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                          id={`delete-btn-${sub.id}`}
                          title={`Delete submission #${sub.id}`}
                        >
                          {deletingId === sub.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          <span>Delete</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300 select-none">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          <div className="sm:hidden space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                onClick={() => navigate(`/submissions/${sub.id}`)}
                className="glass-card p-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900 capitalize">
                      {sub.submission_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <span className={`status-indicator status-${sub.status}`}>
                    <span className="status-dot" />
                    {statusLabel(sub.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="capitalize">{sub.channel}</span>
                    <span>·</span>
                    <span>{formatDate(sub.created_at)}</span>
                    {(sub.submitter_name || sub.submitter_id) && (
                      <>
                        <span>·</span>
                        <span className="text-slate-700 font-medium">{sub.submitter_name || `User #${sub.submitter_id}`}</span>
                      </>
                    )}
                  </div>
                  {canDelete(sub) && (
                    <button
                      onClick={(e) => handleDelete(e, sub.id)}
                      disabled={deletingId === sub.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                      id={`mobile-delete-btn-${sub.id}`}
                    >
                      {deletingId === sub.id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Trash2 size={11} />
                      )}
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-5">
            <p className="text-xs text-slate-500">
              Showing {offset + 1}–{offset + submissions.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                disabled={offset === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                disabled={submissions.length < PAGE_SIZE}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      <NewSubmissionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchSubmissions}
      />
    </div>
  );
}
