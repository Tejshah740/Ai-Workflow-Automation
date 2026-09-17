import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Inbox,
  X,
} from 'lucide-react';
import { getRules, upsertRule } from '../api/workflow';

const AVAILABLE_ROLES = ['reviewer', 'approver', 'admin'];

export default function WorkflowRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState('');
  const [editLevels, setEditLevels] = useState([]);
  const [newType, setNewType] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRules();
      setRules(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  function openAddModal() {
    setEditingType('');
    setNewType('');
    setEditLevels(['approver']);
    setSaveError('');
    setSaveSuccess('');
    setModalOpen(true);
  }

  function openEditModal(rule) {
    setEditingType(rule.submission_type);
    setNewType(rule.submission_type);
    setEditLevels([...rule.levels]);
    setSaveError('');
    setSaveSuccess('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingType('');
    setNewType('');
    setEditLevels([]);
    setSaveError('');
    setSaveSuccess('');
  }

  function addLevel() {
    setEditLevels((prev) => [...prev, 'approver']);
  }

  function removeLevel(index) {
    setEditLevels((prev) => prev.filter((_, i) => i !== index));
  }

  function changeLevel(index, value) {
    setEditLevels((prev) => prev.map((l, i) => (i === index ? value : l)));
  }

  function moveLevel(index, direction) {
    setEditLevels((prev) => {
      const arr = [...prev];
      const target = index + direction;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  async function handleSave() {
    setSaveError('');
    setSaveSuccess('');

    const type = (editingType || newType).trim();
    if (!type) {
      setSaveError('Submission type is required.');
      return;
    }
    if (editLevels.length === 0) {
      setSaveError('At least one approval level is required.');
      return;
    }

    setSaving(true);
    try {
      await upsertRule(type, editLevels);
      setSaveSuccess('Rule saved!');
      await fetchRules();
      setTimeout(() => closeModal(), 800);
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Failed to save rule.');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Workflow Rules
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure approval chains per submission type
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-gradient flex items-center gap-2 text-sm h-9 px-4 self-start"
          id="add-rule-btn"
        >
          <Plus size={15} /> Add Rule
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 mb-6">
          {error}
        </div>
      )}

      {rules.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <Inbox size={32} className="text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            No rules configured
          </h3>
          <p className="text-sm text-slate-500 mb-5 max-w-sm">
            Create workflow rules to define approval chains for different
            submission types. Without rules, the default single-level approver
            chain is used.
          </p>
          <button
            onClick={openAddModal}
            className="btn-gradient flex items-center gap-2 text-sm h-9 px-4"
          >
            <Plus size={15} /> Create first rule
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-wider">
                  Submission Type
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-wider">
                  Approval Levels
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-wider">
                  Updated
                </th>
                <th className="text-right text-xs font-medium text-slate-500 px-4 py-3 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id || rule.submission_type}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 capitalize">
                    {rule.submission_type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      {rule.levels.map((role, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span className="text-slate-700 font-medium capitalize">{role}</span>
                          {i < rule.levels.length - 1 && (
                            <span className="text-slate-400">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(rule.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEditModal(rule)}
                      className="text-xs text-slate-700 hover:text-slate-900 font-medium transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content glass-card p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                {editingType ? 'Edit Rule' : 'New Rule'}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {saveError && (
                <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 animate-fade-in">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 animate-fade-in">
                  <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                  {saveSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Submission Type
                </label>
                <input
                  type="text"
                  value={editingType || newType}
                  onChange={(e) =>
                    editingType ? null : setNewType(e.target.value)
                  }
                  disabled={!!editingType}
                  placeholder="e.g. invoice, leave_request"
                  className="input-field w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  Approval Levels (in order)
                </label>
                {editLevels.map((level, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-4 text-right flex-shrink-0 font-mono">
                      {i + 1}.
                    </span>
                    <select
                      value={level}
                      onChange={(e) => changeLevel(i, e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition-colors cursor-pointer capitalize"
                    >
                      {AVAILABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => moveLevel(i, -1)}
                        disabled={i === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLevel(i, 1)}
                        disabled={i === editLevels.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    {editLevels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLevel(i)}
                        className="text-slate-400 hover:text-rose-600 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLevel}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <Plus size={13} /> Add level
                </button>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                <p className="text-[11px] text-slate-500 mb-1.5">Chain preview</p>
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  {editLevels.map((role, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="text-slate-700 capitalize">
                        L{i + 1}: {role}
                      </span>
                      {i < editLevels.length - 1 && (
                        <span className="text-slate-400">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !!saveSuccess}
                className="btn-gradient w-full flex items-center justify-center gap-2 text-xs h-9"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saveSuccess ? 'Saved' : 'Save Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
