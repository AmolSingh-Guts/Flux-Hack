import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader.jsx';
import Button from '@/components/ui/Button.jsx';
import Input from '@/components/ui/Input.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { listCustomers, getCustomer, createCustomer, updateCustomer } from '@/api/customers.api.js';

export default function CustomersPage() {
  const location = useLocation();
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', company_name: '', status: 'ACTIVE' });
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Load customers from the existing API.
  const loadCustomers = useCallback(async () => {
    await Promise.resolve();
    setTableLoading(true);
    try {
      const result = await listCustomers({});
      setCustomers(result.rows ?? []);
      setServerError('');
    } catch (err) {
      setServerError(err.message ?? 'Failed to load customers.');
      toast.error(err.message ?? 'Failed to load customers.');
    } finally {
      setTableLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadCustomers();
    });
    return () => {
      active = false;
    };
  }, [loadCustomers]);

  const handleEdit = async (id) => {
    try {
      const customer = await getCustomer(id);
      setForm({
        name: customer.name ?? '',
        email: customer.email ?? '',
        company_name: customer.company_name ?? '',
        status: customer.status ?? 'ACTIVE',
      });
      setEditingId(id);
      setEditing(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.message ?? 'Failed to load customer details.');
    }
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    try {
      if (editing && editingId) {
        await updateCustomer(editingId, {
          name: form.name,
          email: form.email,
          company_name: form.company_name,
          status: form.status,
        });
        toast.success('Customer updated successfully.');
      } else {
        await createCustomer({
          name: form.name,
          email: form.email,
          company_name: form.company_name,
          registrationDate: new Date().toISOString().split('T')[0],
        });
        toast.success('Customer created successfully.');
      }
      setForm({ name: '', email: '', company_name: '', status: 'ACTIVE' });
      setEditing(false);
      setEditingId(null);
      loadCustomers();
    } catch (err) {
      setServerError(err.message ?? 'Failed to save customer.');
      toast.error(err.message ?? 'Failed to save customer.');
    }
  };

  // Handle delete/archive
  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await updateCustomer(id, { status: 'ARCHIVED' });
      toast.success('Customer archived successfully.');
      loadCustomers();
    } catch (err) {
      toast.error(err.message ?? 'Failed to archive customer.');
    } finally {
      setDeletingId(null);
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
            title="Customer Management"
            description="Manage customer accounts and subscription history"
          />

          {serverError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-700 px-4 py-3 rounded-md mb-6">
              {serverError}
            </div>
          )}

          <div className="space-y-6">
            {/* Customer Form */}
            <div className="rounded-xl bg-white p-6 shadow-md">
              <h3 className="text-xl font-semibold mb-4">
                {editing ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Name</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="customer@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Company Name</label>
                  <Input
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    placeholder="Acme Inc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Status</label>
                  <Input
                    value={form.status}
                    disabled
                  />
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
                        setForm({ name: '', email: '', company_name: '', status: 'ACTIVE' });
                        setEditing(false);
                        setEditingId(null);
                      }}
                    >
                      Cancel
                    </Button>
                  ) : null}
              </div>
                </form>

              {/* Customer Table */}
              <div className="overflow-x-auto">
                {tableLoading && <p className="px-6 py-3 text-sm text-slate-500">Loading customers…</p>}
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
                        Company
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
                    {customers.map((customer) => (
                      <tr key={customer.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {customer.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {customer.email}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {customer.company_name || '—'}
                        </td>
                        <td className="px-6 py-4">
                          {customer.status === 'ACTIVE' ? (
                            <span className="text-green-600 text-sm font-medium">Active</span>
                          ) : customer.status === 'ARCHIVED' ? (
                            <span className="text-rose-600 text-sm font-medium">Archived</span>
                          ) : (
                            <span className="text-slate-500 text-sm">Inactive</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`${location.pathname}/${customer.id}`}
                              className="text-sm text-brand-600 hover underline"
                            >
                              View
                            </Link>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(customer.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => handleDelete(customer.id)} disabled={deletingId === customer.id}
                            >
                              Archive
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
            {customers.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No customers found. Use the form above to add a new customer.
              </p>
            ) : (
              <p className="text-slate-500 text-center">
                {customers.length} customer{'s' + (customers.length !== 1 ? 's' : '')} displayed
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