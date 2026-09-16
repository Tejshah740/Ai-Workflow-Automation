import { Check, X, Clock, Shield } from 'lucide-react';

export default function ApprovalStepper({ approvals, currentLevel }) {
  if (!approvals || approvals.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        No approval chain created yet.
      </p>
    );
  }

  function dotClass(approval) {
    if (approval.decision === 'approved') return 'approved';
    if (approval.decision === 'rejected') return 'rejected';
    if (currentLevel && approval.id === currentLevel.id) return 'current';
    return 'pending';
  }

  function dotIcon(approval) {
    if (approval.decision === 'approved') return <Check size={11} />;
    if (approval.decision === 'rejected') return <X size={11} />;
    if (currentLevel && approval.id === currentLevel.id)
      return <Clock size={10} />;
    return <span>{approval.level}</span>;
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="stepper-container">
      <div className="stepper-line" />
      {approvals.map((approval) => (
        <div key={approval.id} className="stepper-step">
          
          <div className={`stepper-dot ${dotClass(approval)}`}>
            {dotIcon(approval)}
          </div>

          
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">
                  Level {approval.level}
                </span>
                <span className={`role-badge role-${approval.required_role}`}>
                  <Shield size={10} />
                  {approval.required_role}
                </span>
              </div>
              {approval.decision && (
                <span
                  className={`status-badge ${
                    approval.decision === 'approved'
                      ? 'status-approved'
                      : 'status-rejected'
                  }`}
                >
                  {approval.decision}
                </span>
              )}
              {!approval.decision && currentLevel?.id === approval.id && (
                <span className="status-badge status-ai_processing">
                  awaiting
                </span>
              )}
              {!approval.decision && currentLevel?.id !== approval.id && (
                <span className="status-badge status-submitted">pending</span>
              )}
            </div>

            {approval.decision && (
              <div className="mt-2 space-y-1">
                {approval.decided_by && (
                  <p className="text-xs text-slate-500">
                    Decided by User #{approval.decided_by}
                  </p>
                )}
                {approval.comment && (
                  <p className="text-xs text-slate-400 bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.04] italic">
                    &ldquo;{approval.comment}&rdquo;
                  </p>
                )}
                {approval.decided_at && (
                  <p className="text-[11px] text-slate-600">
                    {formatDate(approval.decided_at)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
