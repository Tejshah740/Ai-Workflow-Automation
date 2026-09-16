import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getSummary,
  getByType,
  getProcessingReport,
  getApprovalsReport,
  getErrorsReport,
} from '../api/dashboard';
import {
  Loader2,
  RefreshCw,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Send,
  FileText,
  Zap,
  TrendingUp,
  Timer,
  BarChart3,
  Users,
} from 'lucide-react';

const STATUS_META = {
  submitted:        { label: 'Submitted',        icon: Send,          color: 'from-slate-500 to-slate-600',    bg: 'bg-slate-500/10',   text: 'text-slate-400' },
  ai_processing:    { label: 'AI Processing',    icon: Cpu,           color: 'from-blue-500 to-cyan-500',      bg: 'bg-blue-500/10',    text: 'text-blue-400' },
  needs_review:     { label: 'Needs Review',     icon: Eye,           color: 'from-amber-500 to-orange-500',   bg: 'bg-amber-500/10',   text: 'text-amber-400' },
  pending_approval: { label: 'Pending Approval', icon: Clock,         color: 'from-violet-500 to-purple-500',  bg: 'bg-violet-500/10',  text: 'text-violet-400' },
  approved:         { label: 'Approved',         icon: CheckCircle2,  color: 'from-emerald-500 to-teal-500',   bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  rejected:         { label: 'Rejected',         icon: XCircle,       color: 'from-rose-500 to-pink-500',      bg: 'bg-rose-500/10',    text: 'text-rose-400' },
  failed:           { label: 'Failed',           icon: AlertTriangle, color: 'from-red-500 to-orange-600',     bg: 'bg-red-500/10',     text: 'text-red-400' },
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
          <Inbox size={40} className="text-slate-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Access Restricted</h2>
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
        <Loader2 size={32} className="animate-spin text-indigo-400 mb-3" />
        <p className="text-sm text-slate-500">Loading dashboard…</p>
      </div>
    );
  }

  const totalSubmissions = summary ? ALL_STATUSES.reduce((acc, s) => acc + (summary[s] || 0), 0) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            System analytics &amp; processing metrics
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12] rounded-xl px-4 py-2 transition-all duration-200 hover:bg-white/[0.04] self-start"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

     
      {summary && (
        <section>
          <SectionHeader icon={BarChart3} title="Status Overview" subtitle={`${totalSubmissions} total submissions`} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ALL_STATUSES.map((status) => {
              const meta = STATUS_META[status];
              const Icon = meta.icon;
              const count = summary[status] || 0;
              const pct = totalSubmissions > 0 ? ((count / totalSubmissions) * 100).toFixed(0) : 0;
              return (
                <div key={status} className="glass-card p-4 group hover:bg-white/[0.02] transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center`}>
                      <Icon size={16} className={meta.text} />
                    </div>
                    <span className="text-[11px] text-slate-600 font-medium">{pct}%</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{meta.label}</p>
                  
                  <div className="mt-3 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-700`}
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
          <SectionHeader icon={Zap} title="AI Processing" subtitle="Extraction & classification metrics" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Total Processed"
              value={processing.total_processed}
              icon={Cpu}
              color="text-blue-400"
              bg="bg-blue-500/10"
            />
            <MetricCard
              label="Auto-Passed"
              value={processing.auto_passed}
              icon={CheckCircle2}
              color="text-emerald-400"
              bg="bg-emerald-500/10"
              subtitle={processing.total_processed > 0 ? `${((processing.auto_passed / processing.total_processed) * 100).toFixed(0)}% pass rate` : null}
            />
            <MetricCard
              label="Needed Review"
              value={processing.needed_review}
              icon={Eye}
              color="text-amber-400"
              bg="bg-amber-500/10"
            />
            <MetricCard
              label="Failed"
              value={processing.failed}
              icon={AlertTriangle}
              color="text-red-400"
              bg="bg-red-500/10"
            />
          </div>

         
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
           
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-indigo-400" />
                  <span className="text-xs font-medium text-slate-400">Avg Confidence</span>
                </div>
                <span className="text-lg font-bold text-white">
                  {processing.average_confidence != null
                    ? `${(processing.average_confidence * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              {processing.average_confidence != null && (
                <div className="confidence-meter">
                  <div
                    className={`confidence-meter-fill ${
                      processing.average_confidence >= 0.8 ? 'high' : processing.average_confidence >= 0.5 ? 'medium' : 'low'
                    }`}
                    style={{ width: `${processing.average_confidence * 100}%` }}
                  />
                </div>
              )}
            </div>

          
            <div className="glass-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer size={14} className="text-indigo-400" />
                  <span className="text-xs font-medium text-slate-400">Avg Processing Time</span>
                </div>
                <span className="text-lg font-bold text-white">
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
          <SectionHeader icon={ShieldCheck} title="Approvals" subtitle="Decision breakdown" />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{approvals.totals?.approved || 0}</p>
                <p className="text-xs text-slate-500">Approved</p>
              </div>
            </div>
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <XCircle size={18} className="text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{approvals.totals?.rejected || 0}</p>
                <p className="text-xs text-slate-500">Rejected</p>
              </div>
            </div>
          </div>

         
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
           
            {approvals.by_level?.length > 0 && (
              <div className="glass-card p-5">
                <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">By Level</h4>
                <div className="space-y-2">
                  {approvals.by_level.map((row, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono w-6">L{row.level}</span>
                        <span className={`status-badge ${row.decision === 'approved' ? 'status-approved' : 'status-rejected'}`}>
                          {row.decision}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-white">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

           
            {approvals.by_approver?.length > 0 && (
              <div className="glass-card p-5">
                <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">By Approver</h4>
                <div className="space-y-2">
                  {approvals.by_approver.map((row, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {row.email?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-xs text-slate-300 truncate">{row.email}</span>
                        <span className={`status-badge ${row.decision === 'approved' ? 'status-approved' : 'status-rejected'}`}>
                          {row.decision}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-white flex-shrink-0">{row.count}</span>
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
          <SectionHeader icon={FileText} title="By Submission Type" subtitle="Status distribution per type" />
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-3 uppercase tracking-wider sticky left-0 bg-[#0a1228]">
                      Type
                    </th>
                    {ALL_STATUSES.map((s) => (
                      <th key={s} className="text-center text-xs font-medium text-slate-500 px-3 py-3 uppercase tracking-wider whitespace-nowrap">
                        {STATUS_META[s].label.split(' ')[0]}
                      </th>
                    ))}
                    <th className="text-center text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byType).map(([type, statuses]) => {
                    const total = ALL_STATUSES.reduce((acc, s) => acc + (statuses[s] || 0), 0);
                    return (
                      <tr key={type} className="border-b border-white/[0.03] last:border-0">
                        <td className="px-5 py-3.5 text-sm font-medium text-white capitalize sticky left-0 bg-[#0a1228] whitespace-nowrap">
                          {type.replace(/_/g, ' ')}
                        </td>
                        {ALL_STATUSES.map((s) => {
                          const count = statuses[s] || 0;
                          return (
                            <td key={s} className="px-3 py-3.5 text-center">
                              {count > 0 ? (
                                <span className={`text-sm font-medium ${STATUS_META[s].text}`}>{count}</span>
                              ) : (
                                <span className="text-xs text-slate-700">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3.5 text-center text-sm font-bold text-white">{total}</td>
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
          <SectionHeader icon={AlertTriangle} title="Recent Errors" subtitle="AI processing failures" />
          <div className="glass-card overflow-hidden">
            <div className="space-y-0">
              {errors.map((err, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.03] last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle size={14} className="text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-white">
                        Submission #{err.submission_id}
                      </span>
                      {err.submission_type && (
                        <span className="text-xs text-slate-500 capitalize">
                          {err.submission_type.replace(/_/g, ' ')}
                        </span>
                      )}
                      {err.channel && (
                        <span className={`status-badge ${err.channel === 'document' ? 'channel-document' : 'channel-request'}`}>
                          {err.channel}
                        </span>
                      )}
                    </div>
                    {err.details && (
                      <p className="text-xs text-slate-500 truncate">
                        {err.details.error || JSON.stringify(err.details)}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-600 mt-1">
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

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <Icon size={16} className="text-indigo-400" />
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {subtitle && <span className="text-xs text-slate-600">· {subtitle}</span>}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, bg, subtitle }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon size={16} className={color} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {subtitle && <p className="text-[11px] text-slate-600 mt-1">{subtitle}</p>}
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
