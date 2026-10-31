import { useEffect, useState } from 'react';
import { KeyRound, Save, ShieldCheck, UserRound } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import FormSection from '../../components/ui/FormSection.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import useAsync from '../../hooks/useAsync.js';
import { getProfile, updateProfile } from '../../api/portal.api.js';
import { changePassword } from '../../api/auth.api.js';
import { formatDateTime, titleCase } from '../../utils/format.js';

const blankProfile = {
  name: '',
  phone: '',
  companyName: '',
  address: '',
  city: '',
  state: '',
  country: '',
  gstNumber: '',
};

const blankPassword = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function PortalProfilePage() {
  const toast = useToast();
  const { refreshUser } = useAuth();
  const { data, loading, error, reload } = useAsync(() => getProfile(), []);
  const [form, setForm] = useState(blankProfile);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [passwordForm, setPasswordForm] = useState(blankPassword);
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!data?.customer) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      name: data.customer.name ?? '',
      phone: data.customer.phone ?? '',
      companyName: data.customer.company_name ?? '',
      address: data.customer.address ?? '',
      city: data.customer.city ?? '',
      state: data.customer.state ?? '',
      country: data.customer.country ?? '',
      gstNumber: data.customer.gst_number ?? '',
    });
  }, [data]);

  if (loading && !data) {
    return <Spinner label="Loading your profile…" />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={reload} />;
  }

  const customer = data.customer;
  const account = data.account;

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      await updateProfile({
        name: form.name.trim(),
        phone: form.phone || null,
        companyName: form.companyName || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        gstNumber: form.gstNumber || null,
      });
      toast.success('Profile updated.');
      await Promise.all([reload(), refreshUser()]);
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

  return (
    <div>
      <PageHeader
        title="My profile"
        description="Keep your contact and billing details up to date, and manage your sign-in password."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Account" description="Your portal identity and account status." />
          <CardBody>
            <div className="flex items-center gap-4">
              <Avatar name={customer.name} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">{customer.name}</p>
                <p className="truncate text-sm text-slate-500">{account.email}</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Role</dt>
                <dd className="font-medium text-slate-900">{titleCase(account.role)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Customer status</dt>
                <dd className="font-medium text-slate-900">{titleCase(customer.status)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Member since</dt>
                <dd className="font-medium text-slate-900">{formatDateTime(customer.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Last sign-in</dt>
                <dd className="font-medium text-slate-900">
                  {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : '—'}
                </dd>
              </div>
            </dl>

            <Alert tone="info" className="mt-5">
              Your sign-in email is managed by Brightloop support. Contact us if it needs to change.
            </Alert>
          </CardBody>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Contact and billing details" description="Used on your invoices and quotations." />
            <form onSubmit={saveProfile}>
              <CardBody className="space-y-5">
                {formError ? <Alert tone="error">{formError}</Alert> : null}

                <FormSection title="Primary contact">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Full name"
                      required
                      value={form.name}
                      onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
                      prefix={<UserRound className="h-4 w-4" />}
                    />
                    <Input
                      label="Phone"
                      value={form.phone}
                      onChange={(event) => setForm((c) => ({ ...c, phone: event.target.value }))}
                      placeholder="+91 90000 00000"
                    />
                    <Input
                      label="Company"
                      value={form.companyName}
                      onChange={(event) => setForm((c) => ({ ...c, companyName: event.target.value }))}
                      containerClassName="sm:col-span-2"
                    />
                  </div>
                </FormSection>

                <FormSection title="Billing address">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Textarea
                      label="Address"
                      rows={2}
                      value={form.address}
                      onChange={(event) => setForm((c) => ({ ...c, address: event.target.value }))}
                      containerClassName="sm:col-span-2"
                    />
                    <Input
                      label="City"
                      value={form.city}
                      onChange={(event) => setForm((c) => ({ ...c, city: event.target.value }))}
                    />
                    <Input
                      label="State"
                      value={form.state}
                      onChange={(event) => setForm((c) => ({ ...c, state: event.target.value }))}
                    />
                    <Input
                      label="Country"
                      value={form.country}
                      onChange={(event) => setForm((c) => ({ ...c, country: event.target.value }))}
                    />
                    <Input
                      label="GSTIN"
                      value={form.gstNumber}
                      onChange={(event) => setForm((c) => ({ ...c, gstNumber: event.target.value }))}
                    />
                  </div>
                </FormSection>

                <div className="flex justify-end">
                  <Button type="submit" icon={Save} loading={saving}>
                    Save profile
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
                    Changing your password signs you out of other sessions.
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
