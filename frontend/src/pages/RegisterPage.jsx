import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import InputField from '../components/InputField';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const errs = {};
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Enter a valid email address';
    }
    if (!form.name.trim()) {
      errs.name = 'Name is required';
    }
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await register(form.email, form.name.trim(), form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setApiError(detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field) {
    return (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
      if (apiError) setApiError('');
    };
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative bg-[#f8fafc]">
      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-slate-900 text-white font-bold text-sm mb-3">
            W
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Create account
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Get started with AI Workflow Automation
          </p>
        </div>

        <div className="glass-card p-6">
          {apiError && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 animate-fade-in">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <InputField
              id="register-email"
              label="Email"
              type="email"
              icon={Mail}
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange('email')}
              error={errors.email}
              autoComplete="email"
            />

            <InputField
              id="register-name"
              label="Full name"
              type="text"
              icon={User}
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange('name')}
              error={errors.name}
              autoComplete="name"
            />

            <InputField
              id="register-password"
              label="Password"
              type="password"
              icon={Lock}
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handleChange('password')}
              error={errors.password}
              autoComplete="new-password"
            />

            <InputField
              id="register-confirm-password"
              label="Confirm password"
              type="password"
              icon={Lock}
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full flex items-center justify-center gap-2 text-xs h-9 mt-2"
              id="register-submit"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-5">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-slate-900 hover:text-slate-700 underline font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
