import { useMemo } from 'react';

/**
 * Safely parse fields if they arrive as a JSON string or object.
 */
export function normalizeFields(fields) {
  if (!fields) return null;
  if (typeof fields === 'string') {
    try {
      const parsed = JSON.parse(fields);
      return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof fields === 'object') {
    return fields;
  }
  return null;
}

export function formatFieldKey(key) {
  if (!key) return '';
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function formatFieldValue(val) {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

/**
 * Inline pills view for tables, queue rows, and compact cards.
 */
export function KeyValuePills({ fields, max = 3, className = '' }) {
  const norm = useMemo(() => normalizeFields(fields), [fields]);
  if (!norm) return null;

  const entries = Object.entries(norm);
  if (entries.length === 0) return null;

  const visible = entries.slice(0, max);
  const remaining = entries.length - max;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {visible.map(([k, v]) => (
        <span
          key={k}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs max-w-[220px] truncate"
          title={`${formatFieldKey(k)}: ${formatFieldValue(v)}`}
        >
          <span className="text-slate-500 font-normal">{formatFieldKey(k)}:</span>
          <span className="truncate font-semibold text-slate-900">{formatFieldValue(v)}</span>
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200/60">
          +{remaining} more
        </span>
      )}
    </div>
  );
}

/**
 * Detailed Grid view for detail pages (SubmissionDetail and WorkflowDetail).
 */
export default function KeyValueDisplay({
  fields,
  title,
  emptyMessage = 'No fields available.',
  badgeText,
  badgeColor = 'bg-slate-100 text-slate-700 border-slate-200',
  className = '',
}) {
  const norm = useMemo(() => normalizeFields(fields), [fields]);

  if (!norm || Object.keys(norm).length === 0) {
    return (
      <div className={`rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  const entries = Object.entries(norm);

  return (
    <div className={`space-y-3 ${className}`}>
      {(title || badgeText) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {title}
            </h3>
          )}
          {badgeText && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badgeColor}`}>
              {badgeText}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {entries.map(([k, v]) => (
          <div
            key={k}
            className="rounded-lg bg-slate-50/80 border border-slate-200/80 p-3 hover:bg-slate-50 transition-colors"
          >
            <span className="text-[11px] font-medium text-slate-500 block truncate mb-1">
              {formatFieldKey(k)}
            </span>
            <span className="text-sm font-semibold text-slate-900 break-words block">
              {formatFieldValue(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
