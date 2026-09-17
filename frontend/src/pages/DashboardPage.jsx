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
  const inPipelineCount = summary ? (summary.submitted || 0) + (summary.ai_processing || 0) + (summary.needs_review || 0) + (summary.pending_approval || 0) : 0;
  const approvedCount = summary?.approved || 0;
  const avgConfidence = processing?.average_confidence;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Overview of document throughput and review pipeline
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* 1. Top KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Submissions"
          value={totalSubmissions}
          subtitle="All recorded items"
        />
        <MetricCard
          label="In Pipeline"
          value={inPipelineCount}
          subtitle={`${summary?.needs_review || 0} review, ${summary?.pending_approval || 0} pending`}
        />
        <MetricCard
          label="Approved"
          value={approvedCount}
          subtitle={totalSubmissions > 0 ? `${((approvedCount / totalSubmissions) * 100).toFixed(0)}% resolution rate` : 'None yet'}
        />
        <MetricCard
          label="AI Confidence"
          value={avgConfidence != null ? `${(avgConfidence * 100).toFixed(1)}%` : '—'}
          subtitle={processing?.auto_passed != null ? `${processing.auto_passed} auto-passed` : 'Avg extraction score'}
        />
      </div>

      {/* 2. Pipeline & Operational Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Distribution */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Pipeline Distribution</h2>
              <p className="text-xs text-slate-500">Live submission state breakdown</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{totalSubmissions} total</span>
          </div>

          <div className="h-2 rounded-full bg-slate-100 flex overflow-hidden mb-4">
            {ALL_STATUSES.map((st) => {
              const count = summary?.[st] || 0;
              const pct = totalSubmissions > 0 ? (count / totalSubmissions) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={st}
                  className={`${STATUS_META[st].barColor} h-full transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                  title={`${STATUS_META[st].label}: ${count}`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_STATUSES.map((st) => {
              const meta = STATUS_META[st];
              const count = summary?.[st] || 0;
              const pct = totalSubmissions > 0 ? ((count / totalSubmissions) * 100).toFixed(0) : 0;
              return (
                <div
                  key={st}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 border border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${meta.barColor}`} />
                    <span className="text-xs font-medium text-slate-700">{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{count}</span>
                    <span className="text-[11px] text-slate-400 font-mono w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Metrics */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Operational Metrics</h2>
            <p className="text-xs text-slate-500 mb-4">Throughput and approval velocity</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Auto-Pass Rate</span>
                  <span className="font-semibold text-slate-900">
                    {processing?.total_processed > 0
                      ? `${((processing.auto_passed / processing.total_processed) * 100).toFixed(0)}%`
                      : '—'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {processing?.auto_passed || 0} of {processing?.total_processed || 0} passed without human review
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Avg Processing Time</span>
                  <span className="font-semibold text-slate-900">
                    {processing?.average_processing_seconds != null
                      ? formatDuration(processing.average_processing_seconds)
                      : '—'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">OCR & rule extraction latency</p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Decision Breakdown</span>
                  <div className="flex gap-2">
                    <span className="text-emerald-600 font-semibold">{approvals?.totals?.approved || 0} Approved</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-rose-600 font-semibold">{approvals?.totals?.rejected || 0} Rejected</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">Reviewer & approver final actions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. By Submission Type Clean Table */}
      {byType && Object.keys(byType).length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Volume by Submission Type</h2>
            <p className="text-xs text-slate-500">Summary counts per intake category</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th className="text-left text-xs font-semibold text-slate-600 px-5 py-2.5 uppercase tracking-wider">
                    Submission Type
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-600 px-4 py-2.5 uppercase tracking-wider">
                    In Review
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-600 px-4 py-2.5 uppercase tracking-wider">
                    Pending
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-600 px-4 py-2.5 uppercase tracking-wider">
                    Approved
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-600 px-4 py-2.5 uppercase tracking-wider">
                    Rejected
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-600 px-5 py-2.5 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byType).map(([type, statuses]) => {
                  const total = ALL_STATUSES.reduce((acc, s) => acc + (statuses[s] || 0), 0);
                  const needsRev = statuses.needs_review || 0;
                  const pend = statuses.pending_approval || 0;
                  const appr = statuses.approved || 0;
                  const rej = statuses.rejected || 0;

                  return (
                    <tr key={type} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-slate-900 capitalize">
                        {type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-medium text-amber-600">
                        {needsRev > 0 ? needsRev : <span className="text-slate-300 font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-medium text-purple-600">
                        {pend > 0 ? pend : <span className="text-slate-300 font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-medium text-emerald-600">
                        {appr > 0 ? appr : <span className="text-slate-300 font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-medium text-rose-600">
                        {rej > 0 ? rej : <span className="text-slate-300 font-normal">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Recent Processing Errors (compact clean list) */}
      {errors.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Recent Processing Errors</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {errors.slice(0, 5).map((err, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 capitalize truncate">
                      {err.submission_type ? err.submission_type.replace(/_/g, ' ') : 'Submission'}
                      <span className="text-slate-500 font-normal ml-2">
                        {err.details?.error || 'Processing issue'}
                      </span>
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap ml-4">
                  {formatDate(err.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
