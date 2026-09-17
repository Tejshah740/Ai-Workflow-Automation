import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  XCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Clock,
  Tag,
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
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate('/workflow')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to queue
        </button>
        <div className="glass-card p-8 text-center">
          <XCircle size={32} className="text-rose-500 mx-auto mb-2" />
          <p className="text-rose-700 text-sm">{error}</p>
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
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back to queue
      </button>

      <div className="glass-card p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 capitalize tracking-tight">
                  {sub.submission_type?.replace(/_/g, ' ') || 'Unknown'}
                </h1>
                <span className={`status-indicator status-${sub.status}`}>
                  <span className="status-dot" />
                  {statusLabel(sub.status)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {sub.original_filename ? (
                  <span className="font-mono text-slate-600">{sub.original_filename}</span>
                ) : (
                  <span>Intake channel: <strong className="capitalize text-slate-700 font-medium">{sub.channel}</strong></span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Workflow Status</span>
            <span className="font-medium text-slate-800 capitalize">
              {statusLabel(sub.status)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Channel</span>
            <span className="font-medium text-slate-800 capitalize flex items-center gap-1.5">
              <Tag size={12} className="text-slate-400" />
              {sub.channel}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Submitted On</span>
            <span className="font-medium text-slate-800 flex items-center gap-1.5">
              <Calendar size={12} className="text-slate-400" />
              {formatDate(sub.created_at)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Last Updated</span>
            <span className="font-medium text-slate-800 flex items-center gap-1.5">
              <Clock size={12} className="text-slate-400" />
              {formatDate(sub.updated_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Approval Chain
            </h2>
            <ApprovalStepper approvals={approvals} currentLevel={currentLevel} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Actions
            </h2>

            {actionError && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 animate-fade-in">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 animate-fade-in">
                <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                {actionSuccess}
              </div>
            )}

            {isFinalStatus ? (
              <div className="action-panel text-center py-5">
                <p className="text-xs text-slate-500">
                  This submission has been{' '}
                  <span className="font-medium text-slate-900 capitalize">
                    {sub.status.replace(/_/g, ' ')}
                  </span>
                  .
                </p>
              </div>
            ) : (
              <>
                {(canApprove || canReject) && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Comment (optional)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a note…"
                      rows={2}
                      className="input-field w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 resize-none focus:border-slate-900"
                    />
                  </div>
                )}

                {canReview && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowFieldModal(true)}
                      disabled={!!actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Correct Fields
                    </button>
                    <button
                      onClick={() => handleAction('resolve')}
                      disabled={!!actionLoading}
                      className="btn-gradient w-full flex items-center justify-center gap-2 text-xs h-9"
                    >
                      {actionLoading === 'resolve' && (
                        <Loader2 size={13} className="animate-spin" />
                      )}
                      Resolve Review
                    </button>
                  </div>
                )}

                {canApprove && (
                  <button
                    onClick={() => handleAction('approve')}
                    disabled={!!actionLoading}
                    className="btn-gradient w-full flex items-center justify-center gap-2 text-xs h-9"
                  >
                    {actionLoading === 'approve' && (
                      <Loader2 size={13} className="animate-spin" />
                    )}
                    Approve
                  </button>
                )}

                {canReject && (
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={!!actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-rose-200 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading === 'reject' && (
                      <Loader2 size={13} className="animate-spin" />
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
