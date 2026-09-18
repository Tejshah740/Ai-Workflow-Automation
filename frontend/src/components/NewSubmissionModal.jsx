import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

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
      }, 1000);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content glass-card p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900">New Submission</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="tab-bar px-5 flex-shrink-0">
          <button
            className={`tab-item ${activeTab === 'document' ? 'tab-active' : ''}`}
            onClick={() => { setActiveTab('document'); setError(''); setSuccess(''); }}
          >
            Document
          </button>
          <button
            className={`tab-item ${activeTab === 'request' ? 'tab-active' : ''}`}
            onClick={() => { setActiveTab('request'); setError(''); setSuccess(''); }}
          >
            Request
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 animate-fade-in">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 animate-fade-in">
              <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
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
                  <div className="space-y-1.5">
                    <FileText size={22} className="text-slate-700 mx-auto" />
                    <p className="text-sm font-medium text-slate-900">{file.name}</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-xs text-rose-600 hover:text-rose-700 transition-colors pt-1 cursor-pointer"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600">
                      Drop file here, or{' '}
                      <span className="text-slate-900 underline font-medium">browse</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {ALLOWED_EXTENSIONS.join(', ')} · Max {MAX_SIZE_MB}MB
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Submission type
                </label>
                <input
                  type="text"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  placeholder="e.g. invoice, receipt, report"
                  className="input-field w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Submission type <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value)}
                  placeholder="e.g. expense_claim, leave_request"
                  className="input-field w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  Fields <span className="text-rose-500">*</span>
                </label>
                {fields.map((field, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => updateField(i, 'key', e.target.value)}
                      placeholder="Key"
                      className="input-field flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateField(i, 'value', e.target.value)}
                      placeholder="Value"
                      className="input-field flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900"
                    />
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeField(i)}
                        className="text-slate-400 hover:text-rose-600 transition-colors flex-shrink-0 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addField}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <Plus size={13} /> Add field
                </button>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || !!success}
            className="btn-gradient w-full flex items-center justify-center gap-2 text-xs h-9 mt-2"
            id="submit-submission"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {success
              ? 'Done'
              : activeTab === 'document'
              ? 'Upload Document'
              : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
