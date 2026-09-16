import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Send,
  Download,
  Trash2,
  Loader2,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
} from 'lucide-react';
import {
  getSubmission,
  downloadSubmission,
  deleteSubmission,
  getAuditTrail,
  getExtraction,
  getValidation,
} from '../api/submissions';

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'ai', label: 'AI Results' },
  { key: 'audit', label: 'Audit Trail' },
];

export default function SubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadSubmission(id, submission?.original_filename);
    } catch {
      setError('Download failed.');
    } finally {
      setDownloading(false);
    }
  }

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

  function confidenceLevel(v) {
    if (v >= 0.8) return 'high';
    if (v >= 0.5) return 'medium';
    return 'low';
  }

  const statusLabel = (s) => s?.replace(/_/g, ' ') || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate('/submissions')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to submissions
        </button>
        <div className="glass-card p-8 text-center">
          <XCircle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const sub = submission;
  const canDelete = sub.status === 'submitted';
  const canDownload = sub.channel === 'document';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
     
      <button
        onClick={() => navigate('/submissions')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
        id="back-to-list"
      >
        <ArrowLeft size={16} /> Back to submissions
      </button>

     
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 mb-6 animate-fade-in">
          {error}
        </div>
      )}

      
      <div className="glass-card p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                sub.channel === 'document'
                  ? 'bg-blue-500/10'
                  : 'bg-purple-500/10'
              }`}
            >
              {sub.channel === 'document' ? (
                <FileText size={22} className="text-blue-400" />
              ) : (
                <Send size={22} className="text-purple-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white capitalize">
                  {sub.submission_type.replace(/_/g, ' ')}
                </h1>
                <span className="text-sm font-mono text-slate-500">
                  #{sub.id}
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                <span className={`status-badge status-${sub.status}`}>
                  {statusLabel(sub.status)}
                </span>
                <span
                  className={`status-badge ${
                    sub.channel === 'document'
                      ? 'channel-document'
                      : 'channel-request'
                  }`}
                >
                  {sub.channel}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Created {formatDate(sub.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Updated {formatDate(sub.updated_at)}
                </span>
              </div>
            </div>
          </div>

          
          <div className="flex gap-2 flex-shrink-0">
            {canDownload && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.06] text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-50"
                id="download-btn"
              >
                {downloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Download
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-500/20 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.06] transition-all disabled:opacity-50"
                id="delete-btn"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

     
      <div className="glass-card overflow-hidden">
        <div className="tab-bar px-2 sm:px-4">
          {TABS.map((tab) => (
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
          {activeTab === 'details' && <DetailsTab sub={sub} formatFileSize={formatFileSize} />}
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


function DetailsTab({ sub, formatFileSize }) {
  if (sub.channel === 'document') {
    return (
      <div className="space-y-4 animate-fade-in">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Document Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow label="Filename" value={sub.original_filename || '—'} />
          <InfoRow label="Content Type" value={sub.content_type || '—'} />
          <InfoRow
            label="File Size"
            value={formatFileSize(sub.file_size_bytes)}
          />
          <InfoRow label="Submitter ID" value={`#${sub.submitter_id}`} />
        </div>
      </div>
    );
  }


  const fields = sub.request_fields || {};
  const entries = Object.entries(fields);

  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">
        Request Fields
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No fields submitted.</p>
      ) : (
        <div className="rounded-xl border border-white/[0.04] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5 uppercase tracking-wider w-1/3">
                  Field
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5 uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, val]) => (
                <tr
                  key={key}
                  className="border-b border-white/[0.03] last:border-0"
                >
                  <td className="px-4 py-3 text-sm font-medium text-indigo-300 font-mono">
                    {key}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300 break-all">
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3">
        <InfoRow label="Submitter ID" value={`#${sub.submitter_id}`} />
      </div>
    </div>
  );
}

function AITab({ extraction, validation, loading, error, confidenceLevel }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error && !extraction && !validation) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <Info size={32} className="text-slate-600 mb-3" />
        <p className="text-sm text-slate-500">{error}</p>
        <p className="text-xs text-slate-600 mt-1">
          AI results appear after processing is complete.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
     
      {extraction && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Extraction Results
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            
            {extraction.ocr_confidence != null && (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">OCR Confidence</p>
                  <p className="text-sm font-semibold text-white">
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
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">
                    Classification Confidence
                  </p>
                  <p className="text-sm font-semibold text-white">
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
              <p className="text-xs text-slate-500 mb-2">Extracted Text</p>
              <pre className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 text-xs text-slate-300 font-mono overflow-x-auto max-h-60 whitespace-pre-wrap">
                {extraction.raw_text}
              </pre>
            </div>
          )}

          
          {extraction.extracted_fields &&
            Object.keys(extraction.extracted_fields).length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2">Extracted Fields</p>
                <pre className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 text-xs text-slate-300 font-mono overflow-x-auto max-h-60 whitespace-pre-wrap">
                  {JSON.stringify(extraction.extracted_fields, null, 2)}
                </pre>
              </div>
            )}
        </div>
      )}

  
      {validation && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            Validation Result
            {validation.is_valid ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Passed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                <XCircle size={12} /> Failed
              </span>
            )}
          </h3>

          {validation.issues && validation.issues.length > 0 && (
            <div className="space-y-2">
              {validation.issues.map((issue, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-xl p-3.5 border ${
                    issue.severity === 'error'
                      ? 'bg-red-500/[0.05] border-red-500/10'
                      : 'bg-amber-500/[0.05] border-amber-500/10'
                  }`}
                >
                  {issue.severity === 'error' ? (
                    <XCircle
                      size={16}
                      className="text-red-400 flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <AlertTriangle
                      size={16}
                      className="text-amber-400 flex-shrink-0 mt-0.5"
                    />
                  )}
                  <div>
                    <p className="text-xs font-medium text-white">
                      {issue.field}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
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
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <Info size={32} className="text-slate-600 mb-3" />
        <p className="text-sm text-slate-500">No audit events recorded.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="relative">
        
        <div className="absolute left-[17px] top-2 bottom-2 w-px bg-white/[0.06]" />

        <div className="space-y-4">
          {logs.map((log, i) => (
            <div key={log.id || i} className="flex gap-4 relative">
             
              <div className="w-[35px] flex items-start justify-center flex-shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500/60 ring-4 ring-[#070d1f] z-10" />
              </div>
              
              <div className="flex-1 rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-medium text-white capitalize">
                    {log.event?.replace(/_/g, ' ')}
                  </p>
                  <span className="text-[11px] text-slate-600 whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {log.actor_id && (
                    <span className="flex items-center gap-1">
                      <User size={11} /> User #{log.actor_id}
                    </span>
                  )}
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <pre className="mt-2 text-[11px] text-slate-500 font-mono bg-white/[0.02] rounded-lg p-2 overflow-x-auto">
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
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3">
      <p className="text-xs text-slate-500 whitespace-nowrap">{label}</p>
      <ChevronRight size={12} className="text-slate-700" />
      <p className="text-sm text-white font-medium truncate">{value}</p>
    </div>
  );
}
