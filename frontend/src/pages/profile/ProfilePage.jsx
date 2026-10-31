import { useState } from 'react';
import { KeyRound, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import FormSection from '../../components/ui/FormSection.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { changePassword, updateAccountProfile } from '../../api/auth.api.js';
import { STAFF_PERMISSIONS } from '../../utils/constants.js';
import { formatDateTime, titleCase } from '../../utils/format.js';

const blankPassword = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function ProfilePage() {
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [passwordForm, setPasswordForm] = useState(blankPassword);
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      await updateAccountProfile({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
      });
      await refreshUser();
      toast.success('Profile updated.');
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }

    setChangingPassword(true);

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password updated.');
      setPasswordForm(blankPassword);
    } catch (requestError) {
      setPasswordError(requestError.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const permissions = user?.permissions ?? [];

  return (
    <div>
      <PageHeader
        title="My profile"
        description="Manage your account details, permissions, and sign-in password."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Account" description="Your identity in this workspace." />
          <CardBody>
            <div className="flex items-center gap-4">
              <Avatar name={user?.name} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">{user?.name}</p>
                <p className="truncate text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Role</dt>
                <dd>
                  <Badge tone="brand">{titleCase(user?.role)}</Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <Badge tone={user?.isActive ? 'emerald' : 'slate'}>
                    {user?.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Last sign-in</dt>
                <dd className="font-medium text-slate-900">
                  {user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Created</dt>
                <dd className="font-medium text-slate-900">
                  {user?.createdAt ? formatDateTime(user.createdAt) : '—'}
                </dd>
              </div>
            </dl>

            {user?.role === 'STAFF' ? (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Permissions
                </p>
                {permissions.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No module permissions assigned.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {permissions.map((permission) => (
                      <Badge key={permission} tone="brand" dot={false}>
                        {STAFF_PERMISSIONS.find((item) => item.key === permission)?.label ??
                          titleCase(permission)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Account details" description="Your name and sign-in email." />
            <form onSubmit={saveProfile}>
              <CardBody className="space-y-5">
                {formError ? <Alert tone="error">{formError}</Alert> : null}

                <FormSection title="Personal information">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Full name"
                      required
                      value={form.name}
                      onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
                      prefix={<UserRound className="h-4 w-4" />}
                    />
                    <Input
                      label="Email address"
                      type="email"
                      required
                      value={form.email}
                      onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))}
                      prefix={<Mail className="h-4 w-4" />}
                      hint="Used to sign in and receive notifications."
                    />
                  </div>
                </FormSection>

                <div className="flex justify-end">
                  <Button type="submit" icon={Save} loading={saving}>
                    Save changes
                  </Button>
                </div>
              </CardBody>
            </form>
          </Card>

          <Card>
            <CardHeader title="Password" description="Choose a strong password you do not use elsewhere." />
            <form onSubmit={savePassword}>
              <CardBody className="space-y-4">
                {passwordError ? <Alert tone="error">{passwordError}</Alert> : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Current password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((c) => ({ ...c, currentPassword: event.target.value }))
                    }
                    containerClassName="sm:col-span-2"
                  />
                  <Input
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((c) => ({ ...c, newPassword: event.target.value }))
                    }
                    hint="At least 9 characters with upper case, lower case, and a special character."
                  />
                  <Input
                    label="Confirm new password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((c) => ({ ...c, confirmPassword: event.target.value }))
                    }
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    Use a unique password that is not shared with anyone.
                  </p>
                  <Button type="submit" variant="secondary" icon={KeyRound} loading={changingPassword}>
                    Update password
                  </Button>
                </div>
              </CardBody>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
