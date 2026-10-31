import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { listStaffMembers, createStaff, updateStaff } from '../../api/staff.api.js';

export default function StaffPage() {
  const toast = useToast();
  const [staffs, setStaffs] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', permissions: [], isActive: true });
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Load staff members from the existing API.
  const loadStaff = useCallback(async () => {
    await Promise.resolve();
    setTableLoading(true);
    try {
      const result = await listStaffMembers({});
      setStaffs(result.rows ?? []);
      setServerError('');
    } catch (err) {
      setServerError(err.message ?? 'Failed to load staff members.');
      toast.error(err.message ?? 'Failed to load staff members.');
    } finally {
      setTableLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadStaff();
    });
    return () => {
      active = false;
    };
  }, [loadStaff]);

  // Handle form submit (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    try {
      if (editing && editingId) {
        await updateStaff(editingId, {
          name: form.name,
          email: form.email,
          permissions: form.permissions,
          isActive: form.isActive,
        });
        toast.success('Staff member updated successfully.');
      } else {
        await createStaff({
          name: form.name,
          email: form.email,
          permissions: form.permissions,
          isActive: form.isActive,
        });
        toast.success('Staff member created successfully.');
      }
      setForm({ name: '', email: '', permissions: [], isActive: true });
      setEditing(false);
      setEditingId(null);
      loadStaff();
    } catch (err) {
      setServerError(err.message ?? 'Failed to save staff member.');
      toast.error(err.message ?? 'Failed to save staff member.');
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      // We don't have a delete staff API, just mark as inactive
      await updateStaff(id, { isActive: false });
      toast.success('Staff member deactivated successfully.');
      loadStaff();
    } catch (err) {
      toast.error(err.message ?? 'Failed to deactivate staff member.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="navbar-container">
        <div className="navbar">
          <Link to="/" className="navbar-logo">
            <span className="logo-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6 text-brand-600"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7.5 7.5A4.5 4.5 0 0 1 12 3h2.5A4.5 4.5 0 0 1 19 7.5v0A4.5 4.5 0 0 1 14.5 12H12a4.5 4.5 0 0 0-4.5 4.5v0A4.5 4.5 0 0 0 12 21h2.5a4.5 4.5 0 0 0 4.5-4.5" />
              </svg>
            </span>
            <span className="logo-text font-semibold text-xl tracking-tight">Brightloop</span>
          </Link>
          <div className="navbar-actions">
            <Link to="/login" className="btn-link">Login</Link>
            <Link to="/register" className="btn-get-started">Get Started</Link>
          </div>
        </div>
      </nav>

      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <PageHeader
            title="Staff Management"
            description="Manage staff accounts and permissions"
          />

          {serverError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-700 px-4 py-3 rounded-md mb-6">
              {serverError}
            </div>
          )}

          <div className="space-y-6">
            {/* Staff Form */}
            <div className="rounded-xl bg-white p-6 shadow-md">
              <h3 className="text-xl font-semibold mb-4">
                {editing ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Name</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="staff@company.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Permissions</label>
                    <Input
                      value={form.permissions.join(', ')}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          permissions: e.target.value
                            .split(',')
                            .map((p) => p.trim())
                            .filter((p) => p),
                        })
                      }
                      placeholder="customers, quotations, subscriptions, invoices, payments"
                      disabled
                    />
                    <p className="text-xs text-slate-500">
                      ADMIN has all permissions. Staff permissions are controlled by role.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Status</label>
                    <Input
                      value={form.isActive ? 'Active' : 'Inactive'}
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700"></label>
                  <Button type="submit" loading={editing}>
                    {editing ? 'Update' : 'Create'}
                  </Button>
                  {editing ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setForm({ name: '', email: '', permissions: [], isActive: true });
                        setEditing(false);
                        setEditingId(null);
                      }}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
            </div>

            {/* Staff Table */}
            <div className="rounded-xl bg-white shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                {tableLoading && <p className="px-6 py-3 text-sm text-slate-500">Loading staff…</p>}
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                        Permissions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffs.map((staff) => (
                      <tr key={staff.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {staff.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {staff.email}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {staff.permissions?.length
                            ? staff.permissions.join(', ')
                            : 'None'}
                        </td>
                        <td className="px-6 py-4">
                          {staff.isActive ? (
                            <span className="text-green-600 text-sm font-medium">Active</span>
                          ) : (
                            <span className="text-rose-600 text-sm font-medium">Inactive</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/staff/${staff.id}/detail`}
                              className="text-sm text-brand-600 hover underline"
                            >
                              View
                            </Link>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(staff.id);
                                setForm({
                                  name: staff.name ?? '',
                                  email: staff.email ?? '',
                                  permissions: staff.permissions ?? [],
                                  isActive: Boolean(staff.isActive),
                                });
                                setEditing(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => handleDelete(staff.id)} disabled={deleting === staff.id}
                            >
                              Deactivate
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination and info */}
            {staffs.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No staff members found. ADMIN can create staff accounts.
              </p>
            ) : (
              <p className="text-slate-500 text-center">
                {staffs.length} staff member{'s' + (staffs.length !== 1 ? 's' : '')} displayed
              </p>
            )}
          </div>
        </div>
      </main>

      <footer className="footer-section">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link to="/" className="footer-logo">
                <span className="logo-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5 text-slate-400"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7.5 7.5A4.5 4.5 0 0 1 12 3h2.5A4.5 4.5 0 0 1 19 7.5v0A4.5 4.5 0 0 1 14.5 12H12a4.5 4.5 0 0 0-4.5 4.5v0A4.5 4.5 0 0 0 12 21h2.5a4.5 4.5 0 0 0 4.5-4.5" />
                  </svg>
                </span>
                <span className="logo-text font-semibold">Brightloop</span>
              </Link>
              <p className="footer-brand-desc">
                Subscription management platform.
              </p>
            </div>
            <div className="footer-links">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/" className="footer-link">Home</Link></li>
                <li><Link to="/login" className="footer-link">Login</Link></li>
              </ul>
            </div>
            <div className="footer-legal">
              <p className="footer-copyright">
                © {new Date().getFullYear()} Brightloop Software. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}