import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Send,
  Clock,
  Loader2,
  XCircle,
  CheckCircle2,
  ShieldCheck,
  ClipboardCheck,
  Pencil,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { getWorkflowStatus, resolveReview, approveSubmission, rejectSubmission } from '../api/workflow';
import { useAuth } from '../context/AuthContext';
import ApprovalStepper from '../components/ApprovalStepper';
import FieldCorrectionModal from '../components/FieldCorrectionModal';

export default function WorkflowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [comment, setComment] = useState('');
  const [showFieldModal, setShowFieldModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getWorkflowStatus(id);
      setData(result);
    } catch (err) {
      setError(err.response?.data?.detail || 'Submission not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAction(action) {
    setActionError('');
    setActionSuccess('');
    setActionLoading(action);

    try {
      if (action === 'resolve') {
        await resolveReview(id);
        setActionSuccess('Review resolved — moved to pending approval.');
      } else if (action === 'approve') {
        await approveSubmission(id, comment);
        setActionSuccess('Submission approved.');
      } else if (action === 'reject') {
        await rejectSubmission(id, comment);
        setActionSuccess('Submission rejected.');
      }
      setComment('');
      await fetchData();
    } catch (err) {
      setActionError(err.response?.data?.detail || `Failed to ${action}.`);
    } finally {
      setActionLoading('');
    }
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const statusLabel = (s) => s?.replace(/_/g, ' ') || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate('/workflow')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to queue
        </button>
        <div className="glass-card p-8 text-center">
          <XCircle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const sub = data.submission;
  const approvals = data.approvals || [];
  const currentLevel = approvals.find((a) => !a.decision) || null;

  const isReviewer = ['reviewer', 'admin'].includes(user?.role);
  const isApprover = ['approver', 'admin'].includes(user?.role);
  const canReview = isReviewer && sub.status === 'needs_review';
  const canApprove =
    sub.status === 'pending_approval' &&
    currentLevel &&
    (user?.role === 'admin' || user?.role === currentLevel.required_role);
  const canReject =
    (isReviewer && sub.status === 'needs_review') ||
    (sub.status === 'pending_approval' &&
      currentLevel &&
      (user?.role === 'admin' || user?.role === currentLevel.required_role));

  const isFinalStatus = ['approved', 'rejected', 'failed'].includes(sub.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
      <button
        onClick={() => navigate('/workflow')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back to queue
      </button>

      <div className="glass-card p-6 sm:p-8 mb-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              sub.channel === 'document' ? 'bg-blue-500/10' : 'bg-purple-500/10'
            }`}
          >
            {sub.channel === 'document' ? (
              <FileText size={22} className="text-blue-400" />
            ) : (
              <Send size={22} className="text-purple-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-white capitalize">
                {sub.submission_type?.replace(/_/g, ' ') || 'Unknown'}
              </h1>
              <span className="text-sm font-mono text-slate-500">#{sub.id}</span>
            </div>
            <div className="flex items-center gap-2.5 mt-2 flex-wrap">
              <span className={`status-badge status-${sub.status}`}>
                {statusLabel(sub.status)}
              </span>
              <span
                className={`status-badge ${
                  sub.channel === 'document' ? 'channel-document' : 'channel-request'
                }`}
              >
                {sub.channel}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock size={12} /> Created {formatDate(sub.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} /> Updated {formatDate(sub.updated_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold text-slate-300 mb-5 flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-400" />
              Approval Chain
            </h2>
            <ApprovalStepper approvals={approvals} currentLevel={currentLevel} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <ClipboardCheck size={16} className="text-indigo-400" />
              Actions
            </h2>

            {actionError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-300 animate-fade-in">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-xs text-emerald-300 animate-fade-in">
                <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                {actionSuccess}
              </div>
            )}

            {isFinalStatus ? (
              <div className="action-panel text-center py-6">
                <p className="text-sm text-slate-500">
                  This submission has been{' '}
                  <span className="font-medium text-white capitalize">
                    {sub.status.replace(/_/g, ' ')}
                  </span>
                  .
                </p>
              </div>
            ) : (
              <>
                {(canApprove || canReject) && (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MessageSquare size={12} /> Comment (optional)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a note…"
                      rows={2}
                      className="input-field w-full rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 resize-none"
                    />
                  </div>
                )}

                {canReview && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowFieldModal(true)}
                      disabled={!!actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.06] text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-50"
                    >
                      <Pencil size={14} /> Correct Fields
                    </button>
                    <button
                      onClick={() => handleAction('resolve')}
                      disabled={!!actionLoading}
                      className="btn-gradient w-full flex items-center justify-center gap-2 text-sm h-10"
                    >
                      {actionLoading === 'resolve' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Resolve Review
                    </button>
                  </div>
                )}

                
                {canApprove && (
                  <button
                    onClick={() => handleAction('approve')}
                    disabled={!!actionLoading}
                    className="btn-gradient w-full flex items-center justify-center gap-2 text-sm h-10"
                  >
                    {actionLoading === 'approve' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    Approve
                  </button>
                )}

                
                {canReject && (
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={!!actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.06] transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'reject' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <XCircle size={14} />
                    )}
                    Reject
                  </button>
                )}

                
                {!canReview && !canApprove && !canReject && (
                  <div className="action-panel text-center py-4">
                    <p className="text-xs text-slate-500">
                      No actions available for your role on this submission.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <FieldCorrectionModal
        isOpen={showFieldModal}
        onClose={() => setShowFieldModal(false)}
        submissionId={parseInt(id)}
        onCorrected={fetchData}
      />
    </div>
  );
}
