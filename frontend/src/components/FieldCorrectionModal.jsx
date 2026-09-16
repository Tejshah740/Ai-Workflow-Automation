import { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
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

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">
              Correct Fields
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

       
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-xs text-slate-500">
            Update or add fields for submission #{submissionId}. Existing fields
            with matching keys will be overwritten.
          </p>

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

          
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => updateField(i, 'key', e.target.value)}
                  placeholder="Field name"
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
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus size={14} /> Add field
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !!success}
            className="btn-gradient w-full flex items-center justify-center gap-2 text-sm h-11"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving…
              </>
            ) : success ? (
              <>
                <CheckCircle2 size={16} /> Done
              </>
            ) : (
              <>
                <Pencil size={16} /> Save Corrections
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
