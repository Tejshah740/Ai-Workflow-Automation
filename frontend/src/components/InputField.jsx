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
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-700 transition-colors duration-150"
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
            input-field w-full rounded-lg border bg-white px-3.5 py-2
            text-xs text-slate-900 placeholder-slate-400
            transition-colors duration-150
            ${Icon ? 'pl-9' : ''}
            ${isPassword ? 'pr-9' : ''}
            ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:shadow-[0_0_0_2px_rgba(244,63,94,0.15)]'
                : 'border-slate-300 hover:border-slate-400 focus:border-slate-900'
            }
          `}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-rose-600 pl-0.5 animate-fade-in">{error}</p>
      )}
    </div>
  );
}
