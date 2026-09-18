import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  Loader2,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  FileText,
  Calendar,
  Clock,
  Tag,
} from 'lucide-react';
import {
  getSubmission,
  deleteSubmission,
  getAuditTrail,
  getExtraction,
  getValidation,
} from '../api/submissions';
import { useAuth } from '../context/AuthContext';
import KeyValueDisplay from '../components/KeyValueDisplay';

const TABS = [
  { key: 'ai', label: 'AI Results' },
  { key: 'audit', label: 'Audit Trail' },
];

export default function SubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ai');
  const [deleting, setDeleting] = useState(false);

  const isRequest = submission?.channel === 'request';
  const tabs = useMemo(() => {
    if (isRequest) {
      return [
        { key: 'fields', label: 'Request Fields' },
        { key: 'audit', label: 'Audit Trail' },
      ];
    }
    return [
      { key: 'ai', label: 'AI Extraction' },
      { key: 'audit', label: 'Audit Trail' },
    ];
  }, [isRequest]);

  useEffect(() => {
    if (submission?.channel === 'request') {
      setActiveTab('fields');
    } else {
      setActiveTab('ai');
    }
  }, [submission?.channel]);

  const [extraction, setExtraction] = useState(null);
  const [validation, setValidation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSubmission(id)
      .then(setSubmission)
      .catch((err) => setError(err.response?.data?.detail || 'Submission not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!submission) return;

    if (activeTab === 'ai' && !extraction && !aiError) {
      setAiLoading(true);
      Promise.allSettled([getExtraction(id), getValidation(id)])
        .then(([extResult, valResult]) => {
          if (extResult.status === 'fulfilled') setExtraction(extResult.value);
          if (valResult.status === 'fulfilled') setValidation(valResult.value);
          if (extResult.status === 'rejected' && valResult.status === 'rejected') {
            setAiError('No AI results available yet.');
          }
        })
        .finally(() => setAiLoading(false));
    }

    if (activeTab === 'audit' && auditLog.length === 0 && !auditLoading) {
      setAuditLoading(true);
      getAuditTrail(id)
        .then(setAuditLog)
        .catch(() => {})
        .finally(() => setAuditLoading(false));
    }
  }, [activeTab, submission, id, extraction, aiError, auditLog.length, auditLoading]);

  async function handleDelete() {
    if (!window.confirm('Delete this submission? This action cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteSubmission(id);
      navigate('/submissions', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete.');
      setDeleting(false);
    }
  }


  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }


  function confidenceLevel(v) {
    if (v >= 0.8) return 'high';
    if (v >= 0.5) return 'medium';
    return 'low';
  }

  const statusLabel = (s) => s?.replace(/_/g, ' ') || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate('/submissions')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to submissions
        </button>
        <div className="glass-card p-8 text-center">
          <XCircle size={32} className="text-rose-500 mx-auto mb-2" />
          <p className="text-rose-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const sub = submission;
  const canDelete = user?.role === 'admin' || sub.submitter_id === user?.id || !sub.submitter_id;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
      <button
        onClick={() => navigate('/submissions')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
        id="back-to-list"
      >
        <ArrowLeft size={16} /> Back to submissions
      </button>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 mb-6 animate-fade-in">
          {error}
        </div>
      )}

      <div className="glass-card p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between gap-3 pb-4 sm:pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
              <FileText size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 capitalize tracking-tight truncate">
                  {sub.submission_type.replace(/_/g, ' ')}
                </h1>
                <span className={`status-indicator status-${sub.status} flex-shrink-0`}>
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

          <div className="flex items-center gap-2 flex-shrink-0">
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-50 cursor-pointer"
                id="delete-btn"
              >
                {deleting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-4 gap-x-6 pt-4 text-xs">
          <div className="min-w-0">
            <span className="text-slate-400 block mb-1">Status</span>
            <span className="font-medium text-slate-800 capitalize truncate block">
              {statusLabel(sub.status)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-slate-400 block mb-1">Submitted By</span>
            <span className="font-medium text-slate-800 flex items-center gap-1.5 min-w-0">
              <User size={12} className="text-slate-400 flex-shrink-0" />
              <span className="truncate" title={sub.submitter_name || (sub.submitter_id ? `User #${sub.submitter_id}` : '—')}>
                {sub.submitter_name || (sub.submitter_id ? `User #${sub.submitter_id}` : '—')}
              </span>
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-slate-400 block mb-1">Channel</span>
            <span className="font-medium text-slate-800 capitalize flex items-center gap-1.5 min-w-0">
              <Tag size={12} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{sub.channel}</span>
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-slate-400 block mb-1">Created At</span>
            <span className="font-medium text-slate-800 flex items-center gap-1.5 min-w-0">
              <Calendar size={12} className="text-slate-400 flex-shrink-0" />
              <span className="truncate" title={formatDate(sub.created_at)}>
                {formatDate(sub.created_at)}
              </span>
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-slate-400 block mb-1">Last Updated</span>
            <span className="font-medium text-slate-800 flex items-center gap-1.5 min-w-0">
              <Clock size={12} className="text-slate-400 flex-shrink-0" />
              <span className="truncate" title={formatDate(sub.updated_at)}>
                {formatDate(sub.updated_at)}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="tab-bar px-4 sm:px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab-item ${activeTab === tab.key ? 'tab-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-6">
          {activeTab === 'fields' && (
            <RequestFieldsTab fields={sub.request_fields} />
          )}
          {activeTab === 'ai' && (
            <AITab
              extraction={extraction}
              validation={validation}
              loading={aiLoading}
              error={aiError}
              confidenceLevel={confidenceLevel}
            />
          )}
          {activeTab === 'audit' && (
            <AuditTab
              logs={auditLog}
              loading={auditLoading}
              formatDate={formatDate}
            />
          )}
        </div>
      </div>
    </div>
  );
}


function RequestFieldsTab({ fields }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <KeyValueDisplay
        fields={fields}
        title="Submitted Request Fields"
        emptyMessage="No request fields were provided."
      />
    </div>
  );
}


function AITab({ extraction, validation, loading, error, confidenceLevel }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && !extraction && !validation) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <Info size={28} className="text-slate-400 mb-2" />
        <p className="text-sm text-slate-500">{error}</p>
        <p className="text-xs text-slate-400 mt-1">
          AI results appear after processing is complete.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {extraction && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Extraction Results
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {extraction.ocr_confidence != null && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-slate-500">OCR Confidence</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {(extraction.ocr_confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="confidence-meter">
                  <div
                    className={`confidence-meter-fill ${confidenceLevel(
                      extraction.ocr_confidence
                    )}`}
                    style={{
                      width: `${extraction.ocr_confidence * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {extraction.classification_confidence != null && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-slate-500">
                    Classification Confidence
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {(extraction.classification_confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="confidence-meter">
                  <div
                    className={`confidence-meter-fill ${confidenceLevel(
                      extraction.classification_confidence
                    )}`}
                    style={{
                      width: `${extraction.classification_confidence * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {extraction.predicted_type && (
            <InfoRow
              label="Predicted Type"
              value={extraction.predicted_type}
            />
          )}

          {extraction.raw_text && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-1.5">Extracted Text</p>
              <pre className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-800 font-mono overflow-x-auto max-h-60 whitespace-pre-wrap">
                {extraction.raw_text}
              </pre>
            </div>
          )}

          {extraction.extracted_fields && (
            <div className="mt-4">
              <KeyValueDisplay
                fields={extraction.extracted_fields}
                title="Extracted Fields"
              />
            </div>
          )}
        </div>
      )}

      {validation && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            Validation Result
            {validation.is_valid ? (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> Passed
              </span>
            ) : (
              <span className="text-xs font-medium text-rose-600 flex items-center gap-1">
                <XCircle size={12} /> Failed
              </span>
            )}
          </h3>

          {validation.issues && validation.issues.length > 0 && (
            <div className="space-y-2">
              {validation.issues.map((issue, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 rounded-lg p-3 border ${
                    issue.severity === 'error'
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  {issue.severity === 'error' ? (
                    <XCircle
                      size={14}
                      className="text-rose-600 flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <AlertTriangle
                      size={14}
                      className="text-amber-600 flex-shrink-0 mt-0.5"
                    />
                  )}
                  <div>
                    <p className="text-xs font-medium text-slate-900">
                      {issue.field}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {issue.issue}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AuditTab({ logs, loading, formatDate }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <Info size={28} className="text-slate-400 mb-2" />
        <p className="text-sm text-slate-500">No audit events recorded.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />

        <div className="space-y-3">
          {logs.map((log, i) => (
            <div key={log.id || i} className="flex gap-3 relative">
              <div className="w-[15px] flex items-start justify-center flex-shrink-0 pt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 z-10" />
              </div>

              <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 p-3 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-slate-900 capitalize">
                    {log.event?.replace(/_/g, ' ')}
                  </p>
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {log.actor_id && (
                    <span className="flex items-center gap-1">
                      <User size={11} /> {log.actor_name || `User #${log.actor_id}`}
                    </span>
                  )}
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <pre className="mt-2 text-[11px] text-slate-700 font-mono bg-white border border-slate-200 rounded p-2 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xs text-slate-900 font-medium truncate max-w-[65%]">{value}</p>
    </div>
  );
}
