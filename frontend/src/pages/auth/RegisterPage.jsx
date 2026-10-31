import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLE_HOME } from '../../utils/constants.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerAccount, loading } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });
  const [error, setError] = useState('');

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Confirm password must match your password.');
      return;
    }
    if (form.password.length < 9 || !/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[!@#$%^&*(),.?:{}|<>]/.test(form.password)) {
      setError('Use at least 9 characters with uppercase, lowercase and a special character.');
      return;
    }
    if (!form.terms) {
      setError('Please accept the Terms and Conditions to continue.');
      return;
    }

    try {
      const newUser = await registerAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      toast.success('Your Brightloop account has been created.');
      navigate(ROLE_HOME[newUser?.role] || '/portal/dashboard', { replace: true });
    } catch (requestError) {
      const message = requestError.message || 'Registration failed. Please try again.';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader title="Create your account" description="Get started with Brightloop Software" />
        <Link to="/login" className="shrink-0 pt-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
          Sign in
        </Link>
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Full name" required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your full name" />
          <Input label="Email address" type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" />
        </div>
        <Input label="Phone number" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91 90000 00000" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Password" type="password" required autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Create a password" />
          <Input label="Confirm password" type="password" required autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Confirm password" />
        </div>
        <Checkbox
          checked={form.terms}
          onChange={(event) => setForm({ ...form, terms: event.target.checked })}
          label="I agree to the Terms and Conditions."
        />
        <p className="-mt-2 text-xs text-slate-500">Read our <Link to="/terms" className="font-medium text-brand-700 hover:underline">Terms and Conditions</Link>.</p>
        <Button type="submit" icon={UserPlus} loading={loading} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
      </p>
    </section>
  );
}
