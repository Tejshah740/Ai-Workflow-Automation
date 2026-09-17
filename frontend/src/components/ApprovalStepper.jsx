import { Check, X } from 'lucide-react';

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

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-900">
                  Level {approval.level}
                </span>
                <span className="text-xs text-slate-500 capitalize">
                  · {approval.required_role}
                </span>
              </div>

              {approval.decision ? (
                <span className={`status-indicator ${approval.decision === 'approved' ? 'status-approved' : 'status-rejected'}`}>
                  <span className="status-dot" />
                  {approval.decision}
                </span>
              ) : currentLevel?.id === approval.id ? (
                <span className="status-indicator status-ai_processing">
                  <span className="status-dot" />
                  awaiting
                </span>
              ) : (
                <span className="status-indicator status-submitted">
                  <span className="status-dot" />
                  pending
                </span>
              )}
            </div>

            {approval.decision && (
              <div className="mt-2 space-y-1 text-xs">
                {approval.decided_by && (
                  <p className="text-slate-500">
                    Decided by User #{approval.decided_by}
                  </p>
                )}
                {approval.comment && (
                  <p className="text-slate-700 bg-white rounded px-2.5 py-1.5 border border-slate-200 italic">
                    &ldquo;{approval.comment}&rdquo;
                  </p>
                )}
                {approval.decided_at && (
                  <p className="text-[11px] text-slate-400">
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
