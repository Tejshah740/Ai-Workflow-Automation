import { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { correctFields } from '../api/workflow';

export default function FieldCorrectionModal({
  isOpen,
  onClose,
  submissionId,
  onCorrected,
}) {
  const [fields, setFields] = useState([{ key: '', value: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function resetForm() {
    setFields([{ key: '', value: '' }]);
    setError('');
    setSuccess('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function updateField(index, prop, value) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [prop]: value } : f))
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

    const validFields = fields.filter((f) => f.key.trim());
    if (validFields.length === 0) {
      setError('At least one field is required.');
      return;
    }

    const fieldsObj = {};
    validFields.forEach((f) => {
      fieldsObj[f.key.trim()] = f.value;
    });

    setLoading(true);
    try {
      await correctFields(submissionId, fieldsObj);
      setSuccess('Fields corrected successfully!');
      onCorrected?.();
      setTimeout(() => handleClose(), 1000);
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Failed to correct fields.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content glass-card p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Correct Fields
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-500">
            Update or add fields for submission #{submissionId}.
          </p>

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

          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => updateField(i, 'key', e.target.value)}
                  placeholder="Field name"
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

          <button
            type="submit"
            disabled={loading || !!success}
            className="btn-gradient w-full flex items-center justify-center gap-2 text-xs h-9 mt-2"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {success ? 'Done' : 'Save Corrections'}
          </button>
        </form>
      </div>
    </div>
  );
}
