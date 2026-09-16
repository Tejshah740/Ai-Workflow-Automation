import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Plus,
  Shield,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Settings,
  X,
  Save,
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
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Workflow Rules
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure approval chains per submission type
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-gradient flex items-center gap-2 text-sm h-10 px-5 self-start"
          id="add-rule-btn"
        >
          <Plus size={16} /> Add Rule
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 mb-6">
          {error}
        </div>
      )}

      {rules.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <Settings size={32} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1.5">
            No rules configured
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">
            Create workflow rules to define approval chains for different
            submission types. Without rules, the default single-level approver
            chain is used.
          </p>
          <button
            onClick={openAddModal}
            className="btn-gradient flex items-center gap-2 text-sm h-10 px-5"
          >
            <Plus size={16} /> Create first rule
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3.5 uppercase tracking-wider">
                  Submission Type
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3.5 uppercase tracking-wider">
                  Approval Levels
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3.5 uppercase tracking-wider">
                  Updated
                </th>
                <th className="text-right text-xs font-medium text-slate-500 px-5 py-3.5 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id || rule.submission_type}
                  className="border-b border-white/[0.03] last:border-0"
                >
                  <td className="px-5 py-4 text-sm font-medium text-white capitalize">
                    {rule.submission_type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {rule.levels.map((role, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span className={`role-badge role-${role}`}>
                            <Shield size={9} />
                            {role}
                          </span>
                          {i < rule.levels.length - 1 && (
                            <span className="text-slate-700 text-xs">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {formatDate(rule.updated_at)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => openEditModal(rule)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-lg font-semibold text-white">
                {editingType ? 'Edit Rule' : 'New Rule'}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {saveError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 animate-fade-in">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300 animate-fade-in">
                  <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                  {saveSuccess}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 pl-1">
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
                  className="input-field w-full rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.03] px-4 py-3 text-sm text-slate-100 placeholder-slate-500 disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300 pl-1">
                  Approval Levels (in order)
                </label>
                {editLevels.map((level, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-5 text-right flex-shrink-0">
                      {i + 1}.
                    </span>
                    <select
                      value={level}
                      onChange={(e) => changeLevel(i, e.target.value)}
                      className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                    >
                      {AVAILABLE_ROLES.map((r) => (
                        <option key={r} value={r} className="bg-slate-900">
                          {r}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => moveLevel(i, -1)}
                        disabled={i === 0}
                        className="p-1 text-slate-600 hover:text-white disabled:opacity-20 transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLevel(i, 1)}
                        disabled={i === editLevels.length - 1}
                        className="p-1 text-slate-600 hover:text-white disabled:opacity-20 transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    {editLevels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLevel(i)}
                        className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLevel}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Plus size={14} /> Add level
                </button>
              </div>

              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                <p className="text-xs text-slate-500 mb-2">Chain preview</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {editLevels.map((role, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className={`role-badge role-${role}`}>
                        <Shield size={9} />
                        L{i + 1}: {role}
                      </span>
                      {i < editLevels.length - 1 && (
                        <span className="text-slate-700 text-xs">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !!saveSuccess}
                className="btn-gradient w-full flex items-center justify-center gap-2 text-sm h-11"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving…
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 size={16} /> Saved
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Rule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
