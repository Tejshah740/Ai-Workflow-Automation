import { useState, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  FileText,
  Send,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { uploadDocument, submitRequest } from '../api/submissions';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function NewSubmissionModal({ isOpen, onClose, onCreated }) {
  const [activeTab, setActiveTab] = useState('document');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  
  const [reqType, setReqType] = useState('');
  const [fields, setFields] = useState([{ key: '', value: '' }]);

  const resetForm = useCallback(() => {
    setFile(null);
    setDocType('');
    setDragOver(false);
    setReqType('');
    setFields([{ key: '', value: '' }]);
    setError('');
    setSuccess('');
  }, []);

  function handleClose() {
    resetForm();
    onClose();
  }

  function validateFile(f) {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError(`File exceeds ${MAX_SIZE_MB}MB limit.`);
      return false;
    }
    setError('');
    return true;
  }

  function handleFileSelect(e) {
    const f = e.target.files?.[0];
    if (f && validateFile(f)) setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && validateFile(f)) setFile(f);
  }

 
  function updateField(index, key, value) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    );
  }

  function addField() {
    setFields((prev) => [...prev, { key: '', value: '' }]);
  }

  function removeField(index) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (activeTab === 'document') {
        if (!file) {
          setError('Please select a file to upload.');
          setLoading(false);
          return;
        }
        await uploadDocument(file, docType || 'unknown');
        setSuccess('Document uploaded successfully!');
      } else {
        if (!reqType.trim()) {
          setError('Submission type is required.');
          setLoading(false);
          return;
        }
        const validFields = fields.filter((f) => f.key.trim());
        if (validFields.length === 0) {
          setError('At least one field is required.');
          setLoading(false);
          return;
        }
        const fieldsObj = {};
        validFields.forEach((f) => {
          fieldsObj[f.key.trim()] = f.value;
        });
        await submitRequest(reqType.trim(), fieldsObj);
        setSuccess('Request submitted successfully!');
      }
      onCreated?.();
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content glass-card p-0"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white">New Submission</h2>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        
        <div className="tab-bar px-6">
          <button
            className={`tab-item ${activeTab === 'document' ? 'tab-active' : ''}`}
            onClick={() => { setActiveTab('document'); setError(''); setSuccess(''); }}
          >
            <span className="flex items-center gap-1.5">
              <Upload size={14} /> Upload Document
            </span>
          </button>
          <button
            className={`tab-item ${activeTab === 'request' ? 'tab-active' : ''}`}
            onClick={() => { setActiveTab('request'); setError(''); setSuccess(''); }}
          >
            <span className="flex items-center gap-1.5">
              <Send size={14} /> Submit Request
            </span>
          </button>
        </div>

       
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 animate-fade-in">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300 animate-fade-in">
              <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
              {success}
            </div>
          )}

          {activeTab === 'document' ? (
            <>
             
              <div
                className={`dropzone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_EXTENSIONS.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {file ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <FileText size={24} className="text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-white/[0.04] flex items-center justify-center">
                      <Upload size={24} className="text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-300">
                      Drop your file here, or{' '}
                      <span className="text-indigo-400 font-medium">browse</span>
                    </p>
                    <p className="text-xs text-slate-600">
                      {ALLOWED_EXTENSIONS.join(', ')} — Max {MAX_SIZE_MB}MB
                    </p>
                  </div>
                )}
              </div>

        
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 pl-1">
                  Submission type
                </label>
                <input
                  type="text"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  placeholder="e.g. invoice, receipt, report"
                  className="input-field w-full rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.03] px-4 py-3 text-sm text-slate-100 placeholder-slate-500"
                />
              </div>
            </>
          ) : (
            <>
             
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 pl-1">
                  Submission type <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value)}
                  placeholder="e.g. expense_claim, leave_request"
                  className="input-field w-full rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.03] px-4 py-3 text-sm text-slate-100 placeholder-slate-500"
                />
              </div>

             
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300 pl-1">
                  Fields <span className="text-red-400">*</span>
                </label>
                {fields.map((field, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => updateField(i, 'key', e.target.value)}
                      placeholder="Key"
                      className="input-field flex-1 rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateField(i, 'value', e.target.value)}
                      placeholder="Value"
                      className="input-field flex-1 rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500"
                    />
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeField(i)}
                        className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addField}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
                >
                  <Plus size={14} /> Add field
                </button>
              </div>
            </>
          )}

         
          <button
            type="submit"
            disabled={loading || !!success}
            className="btn-gradient w-full flex items-center justify-center gap-2 text-sm h-11"
            id="submit-submission"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {activeTab === 'document' ? 'Uploading…' : 'Submitting…'}
              </>
            ) : success ? (
              <>
                <CheckCircle2 size={16} />
                Done
              </>
            ) : activeTab === 'document' ? (
              <>
                <Upload size={16} />
                Upload Document
              </>
            ) : (
              <>
                <Send size={16} />
                Submit Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
