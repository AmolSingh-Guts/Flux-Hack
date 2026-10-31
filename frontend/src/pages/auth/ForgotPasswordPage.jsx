import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailSearch, Loader2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { forgotPassword } from '../../api/auth.api.js';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSending(true);

    try {
      const result = await forgotPassword({ email: form.email });
      if (result?.success) {
        setSuccess('A password reset link has been sent to your email.');
        setForm({ email: '' });
        setTimeout(() => {
          setSuccess('');
          navigate('/login', { replace: true });
        }, 3000);
      } else {
        setError(result?.message ?? 'Failed to send reset link.');
      }
    } catch (requestError) {
      setError(requestError.message ?? 'An error occurred. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
        <PageHeader
          title="Brightloop Software"
          description="Password Reset"
          actions={<Link to="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700">Back to login</Link>}
        />

        {success && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-700 px-4 py-3 rounded-md mb-6 animate-bounce">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-300 text-rose-700 px-4 py-3 rounded-md mb-6 animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleForgotPassword} className="space-y-6">
          <Input
            label="Registered Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="enter your email"
          />

          <Button type="submit" icon={sending ? Loader2 : MailSearch} loading={sending}>
            Send Reset Link
          </Button>

          <div className="text-center">
            <p className="text-sm text-slate-500">
              Don't have an account? <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">Create account</Link>
            </p>
            <p className="text-sm text-slate-500">
              Remember your password? <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">Sign in</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}