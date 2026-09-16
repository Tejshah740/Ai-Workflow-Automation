import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Filter,
  FileText,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { listSubmissions } from '../api/submissions';
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
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [offset, setOffset] = useState(0);

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
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatFileSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const statusLabel = (s) => s.replace(/_/g, ' ');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
     
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Submissions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your documents and requests
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-gradient flex items-center gap-2 text-sm h-10 px-5 self-start"
          id="new-submission-btn"
        >
          <Plus size={16} />
          New Submission
        </button>
      </div>

      
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
    
          <div className="flex items-center gap-2 flex-1">
            <Filter size={16} className="text-slate-500 flex-shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
              id="status-filter"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value} className="bg-slate-900">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

         
          <div className="flex rounded-lg border border-white/[0.06] overflow-hidden flex-shrink-0">
            {CHANNELS.map((ch) => (
              <button
                key={ch.value}
                onClick={() => setChannelFilter(ch.value)}
                className={`px-3.5 py-2 text-xs font-medium transition-all duration-200 ${
                  channelFilter === ch.value
                    ? 'bg-indigo-500/15 text-indigo-300'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>

    
          <button
            onClick={fetchSubmissions}
            disabled={loading}
            className="text-slate-500 hover:text-white transition-colors flex-shrink-0 p-2 rounded-lg hover:bg-white/[0.04]"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 mb-6 animate-fade-in">
          {error}
        </div>
      )}

      {loading && submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-400 mb-3" />
          <p className="text-sm text-slate-500">Loading submissions…</p>
        </div>
      ) : submissions.length === 0 ? (
        
        <div className="glass-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <Inbox size={32} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1.5">
            No submissions yet
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">
            Upload a document or submit a request to get started with AI-powered
            processing.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-gradient flex items-center gap-2 text-sm h-10 px-5"
          >
            <Plus size={16} />
            Create your first submission
          </button>
        </div>
      ) : (
        <>
          
          <div className="hidden md:block glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3.5 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3.5 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3.5 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3.5 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3.5 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3.5 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => navigate(`/submissions/${sub.id}`)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors duration-150 group"
                  >
                    <td className="px-5 py-4 text-sm font-mono text-slate-400">
                      #{sub.id}
                    </td>
                    <td className="px-5 py-4 text-sm text-white font-medium capitalize">
                      {sub.submission_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`status-badge ${
                          sub.channel === 'document'
                            ? 'channel-document'
                            : 'channel-request'
                        }`}
                      >
                        {sub.channel === 'document' ? (
                          <FileText size={12} />
                        ) : (
                          <Send size={12} />
                        )}
                        {sub.channel}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`status-badge status-${sub.status}`}
                      >
                        {statusLabel(sub.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 max-w-[200px] truncate">
                      {sub.channel === 'document'
                        ? sub.original_filename || '—'
                        : sub.request_fields
                        ? Object.keys(sub.request_fields).length + ' fields'
                        : '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(sub.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

         
          <div className="md:hidden space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                onClick={() => navigate(`/submissions/${sub.id}`)}
                className="glass-card p-4 cursor-pointer hover:bg-white/[0.02] transition-colors duration-150"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-white capitalize">
                      {sub.submission_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      #{sub.id}
                    </p>
                  </div>
                  <span className={`status-badge status-${sub.status}`}>
                    {statusLabel(sub.status)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span
                    className={`status-badge ${
                      sub.channel === 'document'
                        ? 'channel-document'
                        : 'channel-request'
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
                  {sub.channel === 'document' && sub.file_size_bytes && (
                    <span>{formatFileSize(sub.file_size_bytes)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          
          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-slate-600">
              Showing {offset + 1}–{offset + submissions.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                disabled={offset === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                disabled={submissions.length < PAGE_SIZE}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
