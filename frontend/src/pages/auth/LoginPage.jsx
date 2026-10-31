import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLE_HOME } from '../../utils/constants.js';

const DEMO_ACCOUNTS = {
  Admin: { email: 'admin@brightloop.test', password: 'Admin@1234' },
  Staff: { email: 'staff@brightloop.test', password: 'Staff@1234' },
  Customer: { email: 'customer@brightloop.test', password: 'Customer@1234' },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin, loading, user, homePath } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate(homePath, { replace: true });
    }
  }, [loading, user, homePath, navigate]);

  const fillDemo = (role) => {
    setForm((current) => ({ ...current, ...DEMO_ACCOUNTS[role] }));
    setError('');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const authenticatedUser = await authLogin({
        email: form.email.trim(),
        password: form.password,
      });
      const destination = ROLE_HOME[authenticatedUser?.role] || '/';
      const requestedPath = location.state?.from;
      navigate(requestedPath || destination, { replace: true });
    } catch (requestError) {
      const message = requestError.message || 'Login failed. Check your email and password.';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-8">
      <div className="mb-7 flex items-start justify-between gap-4">
        <PageHeader
          title="Brightloop Software"
          description="Subscription Management Platform"
        />
        <Link to="/register" className="shrink-0 pt-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
          Create account
        </Link>
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleLogin} className="space-y-5">
        <Input
          label="Email address"
          type="email"
          autoComplete="username"
          required
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="you@company.com"
        />

        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPassword ? 'Hide password' : 'Show password'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Checkbox
            checked={form.rememberMe}
            onChange={(event) => setForm({ ...form, rememberMe: event.target.checked })}
            label="Remember me"
          />
          <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" icon={Lock} loading={loading} className="w-full">
          Sign in securely
        </Button>
      </form>

      {import.meta.env.DEV ? (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ShieldCheck size={16} className="text-brand-700" />
            Development demo accounts
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(DEMO_ACCOUNTS).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => fillDemo(role)}
                className="rounded-lg border border-blue-200 bg-white px-2 py-2 text-xs font-semibold text-brand-800 transition hover:border-brand-400 hover:bg-blue-100"
              >
                {role}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Select a role to fill the seeded demo credentials, then click Sign in. Demo shortcuts are hidden in production builds.
          </p>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm text-slate-500">
        New to Brightloop?{' '}
        <Link to="/register" className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </section>
  );
}
