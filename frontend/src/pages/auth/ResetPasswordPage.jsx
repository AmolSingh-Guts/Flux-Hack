import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { resetPassword } from '../../api/auth.api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ResetPasswordPage() {
  const { id: token } = useParams();
  const navigate = useNavigate();
  const { isLoading } = useAuth();
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check token validity on mount
  useEffect(() => {
    if (!token) {
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    }
  }, [navigate, token]);

  const handleResetPassword = useCallback(
    async (e) => {
      e.preventDefault();

      if (form.newPassword !== form.confirmPassword) {
        setError('Confirm password must match new password');
        return;
      }

      if (form.newPassword.length < 9) {
        setError('Password must be at least 9 characters');
        return;
      }

      try {
        const result = await resetPassword({
          token,
          newPassword: form.newPassword,
        });

        if (result?.success) {
          setSuccess('Your password has been reset successfully! You can now login.');
          setForm({ newPassword: '', confirmPassword: '' });
          setTimeout(() => {
            setSuccess('');
            navigate('/login', { replace: true });
          }, 3000);
        } else {
          setError(result?.message ?? 'Failed to reset password.');
        }
      } catch (requestError) {
        setError(requestError.message ?? 'An error occurred. Please try again.');
      }
    },
    [token, form.newPassword, form.confirmPassword, navigate]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
        <PageHeader
          title="Brightloop Software"
          description="Reset Your Password"
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

        <form onSubmit={handleResetPassword} className="space-y-6">
          <Input
            label="New Password"
            type="password"
            required
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            placeholder="enter new password"
            hint="At least 9 characters with uppercase, lowercase, and special character"
          />

          <Input
            label="Confirm New Password"
            type="password"
            required
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="confirm new password"
          />

          <Button type="submit" icon={Lock} loading={isLoading}>
            Reset Password
          </Button>

          <div className="text-center">
            <p className="text-sm text-slate-500">
              Already have an account? <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">Sign in</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}