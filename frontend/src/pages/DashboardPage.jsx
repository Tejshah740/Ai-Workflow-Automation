import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Shield,
  Calendar,
  ChevronRight,
  FileText,
  BarChart3,
  Zap,
} from 'lucide-react';

const roleBadgeColors = {
  admin: 'from-rose-500 to-pink-600',
  reviewer: 'from-amber-500 to-orange-600',
  approver: 'from-emerald-500 to-teal-600',
  submitter: 'from-indigo-500 to-violet-600',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const badgeGradient = roleBadgeColors[user.role] || roleBadgeColors.submitter;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Welcome back 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Here&apos;s your account overview
        </p>
      </div>

      {/* Profile Card */}
      <div className="glass-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/20 flex-shrink-0">
            {user.email.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">
              {user.email}
            </h2>
            <div className="mt-1.5">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1 rounded-full bg-gradient-to-r ${badgeGradient} shadow-sm`}
              >
                <Shield size={12} />
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.06] my-6" />

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailCard
            icon={User}
            label="User ID"
            value={`#${user.id}`}
          />
          <DetailCard
            icon={Calendar}
            label="Member since"
            value={memberSince}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <h3 className="text-sm font-semibold text-slate-400 mt-8 mb-3 pl-1">
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <QuickAction
          icon={FileText}
          label="Submissions"
          description="View & manage your submissions"
          onClick={() => navigate('/submissions')}
        />
        <QuickAction
          icon={BarChart3}
          label="AI Processing"
          description="Check extraction & validation results"
          onClick={() => navigate('/submissions')}
        />
      </div>
    </div>
  );
}

function DetailCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3.5">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-indigo-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-white truncate">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="glass-card flex items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-all duration-200 group w-full"
    >
      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <ChevronRight
        size={16}
        className="text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0"
      />
    </button>
  );
}
