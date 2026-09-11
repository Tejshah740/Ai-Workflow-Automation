import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function InputField({
  id,
  label,
  type = 'text',
  icon: Icon,
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-300 pl-1"
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <Icon
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200"
          />
        )}
        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`
            input-field w-full rounded-xl border bg-white/[0.03] px-4 py-3
            text-sm text-slate-100 placeholder-slate-500
            transition-all duration-200
            ${Icon ? 'pl-11' : ''}
            ${isPassword ? 'pr-11' : ''}
            ${
              error
                ? 'border-red-500/50 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                : 'border-white/[0.06] hover:border-white/[0.12]'
            }
          `}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-200 focus:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-400 pl-1 animate-fade-in">{error}</p>
      )}
    </div>
  );
}
