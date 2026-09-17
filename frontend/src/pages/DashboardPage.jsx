import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getSummary,
  getByType,
  getProcessingReport,
  getApprovalsReport,
  getErrorsReport,
} from '../api/dashboard';
import { Loader2, Inbox } from 'lucide-react';

const STATUS_META = {
  submitted:        { label: 'Submitted',        barColor: 'bg-slate-400',   textColor: 'text-slate-600' },
  ai_processing:    { label: 'AI Processing',    barColor: 'bg-blue-500',    textColor: 'text-blue-600' },
  needs_review:     { label: 'Needs Review',     barColor: 'bg-amber-500',   textColor: 'text-amber-600' },
  pending_approval: { label: 'Pending Approval', barColor: 'bg-purple-500',  textColor: 'text-purple-600' },
  approved:         { label: 'Approved',         barColor: 'bg-emerald-500', textColor: 'text-emerald-600' },
  rejected:         { label: 'Rejected',         barColor: 'bg-rose-500',    textColor: 'text-rose-600' },
  failed:           { label: 'Failed',           barColor: 'bg-red-500',     textColor: 'text-red-600' },
};

const ALL_STATUSES = Object.keys(STATUS_META);

export default function DashboardPage() {
  const { user } = useAuth();
  const canView = ['admin', 'reviewer', 'approver'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [byType, setByType] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [approvals, setApprovals] = useState(null);
  const [errors, setErrors] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, bt, pr, ar, er] = await Promise.all([
        getSummary(),
        getByType(),
        getProcessingReport(),
        getApprovalsReport(),
        getErrorsReport(20),
      ]);
      setSummary(s);
      setByType(bt);
      setProcessing(pr);
      setApprovals(ar);
      setErrors(er);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) fetchAll();
    else setLoading(false);
  }, [canView, fetchAll]);

  if (!canView) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center animate-slide-up">
        <div className="glass-card p-12">
          <Inbox size={32} className="text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900 mb-1">Access Restricted</h2>
          <p className="text-sm text-slate-500">
            Dashboard analytics are available for admin, reviewer, and approver roles.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-slate-400 mb-2" />
        <p className="text-xs text-slate-500">Loading metrics…</p>
      </div>
    );
  }

  const totalSubmissions = summary ? ALL_STATUSES.reduce((acc, s) => acc + (summary[s] || 0), 0) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          System analytics &amp; processing metrics
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <section>
          <SectionHeader title="Status Overview" subtitle={`${totalSubmissions} total`} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ALL_STATUSES.map((status) => {
              const meta = STATUS_META[status];
              const count = summary[status] || 0;
              const pct = totalSubmissions > 0 ? ((count / totalSubmissions) * 100).toFixed(0) : 0;
              return (
                <div key={status} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-600">{meta.label}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{pct}%</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">{count}</p>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${meta.barColor} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {processing && (
        <section>
          <SectionHeader title="AI Processing" subtitle="Extraction & classification metrics" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Total Processed"
              value={processing.total_processed}
            />
            <MetricCard
              label="Auto-Passed"
              value={processing.auto_passed}
              subtitle={processing.total_processed > 0 ? `${((processing.auto_passed / processing.total_processed) * 100).toFixed(0)}% pass rate` : null}
            />
            <MetricCard
              label="Needed Review"
              value={processing.needed_review}
            />
            <MetricCard
              label="Failed"
              value={processing.failed}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-600">Avg Confidence</span>
                <span className="text-base font-semibold text-slate-900">
                  {processing.average_confidence != null
                    ? `${(processing.average_confidence * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              {processing.average_confidence != null && (
                <div className="confidence-meter mt-2">
                  <div
                    className={`confidence-meter-fill ${
                      processing.average_confidence >= 0.8 ? 'high' : processing.average_confidence >= 0.5 ? 'medium' : 'low'
                    }`}
                    style={{ width: `${processing.average_confidence * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Avg Processing Time</span>
                <span className="text-base font-semibold text-slate-900">
                  {processing.average_processing_seconds != null
                    ? formatDuration(processing.average_processing_seconds)
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {approvals && (
        <section>
          <SectionHeader title="Approvals" subtitle="Decision breakdown" />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="glass-card p-4">
              <span className="text-xs font-medium text-slate-600">Approved</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{approvals.totals?.approved || 0}</p>
            </div>
            <div className="glass-card p-4">
              <span className="text-xs font-medium text-slate-600">Rejected</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">{approvals.totals?.rejected || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {approvals.by_level?.length > 0 && (
              <div className="glass-card p-4">
                <h4 className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">By Level</h4>
                <div className="space-y-2">
                  {approvals.by_level.map((row, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono w-6">L{row.level}</span>
                        <span className={`status-indicator ${row.decision === 'approved' ? 'status-approved' : 'status-rejected'}`}>
                          <span className="status-dot" />
                          {row.decision}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approvals.by_approver?.length > 0 && (
              <div className="glass-card p-4">
                <h4 className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">By Approver</h4>
                <div className="space-y-2">
                  {approvals.by_approver.map((row, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-slate-700 text-[10px] font-semibold flex-shrink-0">
                          {row.email?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-xs text-slate-800 truncate">{row.email}</span>
                        <span className={`status-indicator ${row.decision === 'approved' ? 'status-approved' : 'status-rejected'}`}>
                          <span className="status-dot" />
                          {row.decision}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 flex-shrink-0">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {byType && Object.keys(byType).length > 0 && (
        <section>
          <SectionHeader title="By Submission Type" subtitle="Status distribution per type" />
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 uppercase tracking-wider sticky left-0 bg-slate-50">
                      Type
                    </th>
                    {ALL_STATUSES.map((s) => (
                      <th key={s} className="text-center text-xs font-semibold text-slate-600 px-3 py-3 uppercase tracking-wider whitespace-nowrap">
                        {STATUS_META[s].label.split(' ')[0]}
                      </th>
                    ))}
                    <th className="text-center text-xs font-semibold text-slate-600 px-4 py-3 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byType).map(([type, statuses]) => {
                    const total = ALL_STATUSES.reduce((acc, s) => acc + (statuses[s] || 0), 0);
                    return (
                      <tr key={type} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 capitalize sticky left-0 bg-white whitespace-nowrap">
                          {type.replace(/_/g, ' ')}
                        </td>
                        {ALL_STATUSES.map((s) => {
                          const count = statuses[s] || 0;
                          return (
                            <td key={s} className="px-3 py-3 text-center">
                              {count > 0 ? (
                                <span className={`text-sm font-semibold ${STATUS_META[s].textColor}`}>{count}</span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {errors.length > 0 && (
        <section>
          <SectionHeader title="Recent Errors" subtitle="AI processing failures" />
          <div className="glass-card overflow-hidden">
            <div className="space-y-0">
              {errors.map((err, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-slate-900">
                        Submission #{err.submission_id}
                      </span>
                      {err.submission_type && (
                        <span className="text-xs text-slate-500 capitalize">
                          {err.submission_type.replace(/_/g, ' ')}
                        </span>
                      )}
                      {err.channel && (
                        <span className="text-xs text-slate-400 capitalize">
                          · {err.channel}
                        </span>
                      )}
                    </div>
                    {err.details && (
                      <p className="text-xs text-slate-600 truncate">
                        {err.details.error || JSON.stringify(err.details)}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                      {formatDate(err.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {subtitle && <span className="text-xs text-slate-500">· {subtitle}</span>}
    </div>
  );
}

function MetricCard({ label, value, subtitle }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 tracking-tight">{value ?? '—'}</p>
      {subtitle && <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
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
