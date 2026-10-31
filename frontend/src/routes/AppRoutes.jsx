import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import LandingPage from '../pages/LandingPage.jsx';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage.jsx';
import TermsPage from '../pages/TermsPage.jsx';

const LoginPage = lazy(() => import('../pages/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage.jsx'));

const AdminDashboardPage = lazy(() => import('../pages/dashboard/AdminDashboardPage.jsx'));
const StaffDashboardPage = lazy(() => import('../pages/dashboard/StaffDashboardPage.jsx'));
const CustomersPage = lazy(() => import('../pages/customers/CustomersPage.jsx'));
const CustomerDetailPage = lazy(() => import('../pages/customers/CustomerDetailPage.jsx'));
const ProductsPage = lazy(() => import('../pages/products/ProductsPage.jsx'));
const ProductDetailPage = lazy(() => import('../pages/products/ProductDetailPage.jsx'));
const PlansPage = lazy(() => import('../pages/plans/PlansPage.jsx'));
const TaxesPage = lazy(() => import('../pages/taxes/TaxesPage.jsx'));
const DiscountsPage = lazy(() => import('../pages/discounts/DiscountsPage.jsx'));
const QuotationsPage = lazy(() => import('../pages/quotations/QuotationsPage.jsx'));
const QuotationFormPage = lazy(() => import('../pages/quotations/QuotationFormPage.jsx'));
const QuotationDetailPage = lazy(() => import('../pages/quotations/QuotationDetailPage.jsx'));
const SubscriptionsPage = lazy(() => import('../pages/subscriptions/SubscriptionsPage.jsx'));
const SubscriptionFormPage = lazy(() => import('../pages/subscriptions/SubscriptionFormPage.jsx'));
const SubscriptionDetailPage = lazy(() => import('../pages/subscriptions/SubscriptionDetailPage.jsx'));
const InvoicesPage = lazy(() => import('../pages/invoices/InvoicesPage.jsx'));
const InvoiceFormPage = lazy(() => import('../pages/invoices/InvoiceFormPage.jsx'));
const InvoiceDetailPage = lazy(() => import('../pages/invoices/InvoiceDetailPage.jsx'));
const PaymentsPage = lazy(() => import('../pages/payments/PaymentsPage.jsx'));
const PaymentDetailPage = lazy(() => import('../pages/payments/PaymentDetailPage.jsx'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage.jsx'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage.jsx'));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage.jsx'));
const StaffPage = lazy(() => import('../pages/staff/StaffPage.jsx'));
const PortalDashboardPage = lazy(() => import('../pages/portal/PortalDashboardPage.jsx'));
const PortalProfilePage = lazy(() => import('../pages/portal/PortalProfilePage.jsx'));
const PortalSubscriptionsPage = lazy(() => import('../pages/portal/PortalSubscriptionsPage.jsx'));
const PortalSubscriptionDetailPage = lazy(() => import('../pages/portal/PortalSubscriptionDetailPage.jsx'));
const PortalInvoicesPage = lazy(() => import('../pages/portal/PortalInvoicesPage.jsx'));
const PortalInvoiceDetailPage = lazy(() => import('../pages/portal/PortalInvoiceDetailPage.jsx'));
const PortalPaymentsPage = lazy(() => import('../pages/portal/PortalPaymentsPage.jsx'));
const PortalPaymentDetailPage = lazy(() => import('../pages/portal/PortalPaymentDetailPage.jsx'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-slate-600">Loading Brightloop…</div>}>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Authentication pages share the auth layout */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Admin area */}
        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route path="/admin" element={<DashboardLayout />}>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="staff/:id/detail" element={<StaffPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="taxes" element={<TaxesPage />} />
            <Route path="discounts" element={<DiscountsPage />} />
            <Route path="quotations" element={<QuotationsPage />} />
            <Route path="quotations/new" element={<QuotationFormPage />} />
            <Route path="quotations/:id" element={<QuotationDetailPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="subscriptions/new" element={<SubscriptionFormPage />} />
            <Route path="subscriptions/:id" element={<SubscriptionDetailPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/new" element={<InvoiceFormPage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="payments/:id" element={<PaymentDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Staff area */}
        <Route element={<ProtectedRoute roles={['ADMIN', 'STAFF']} />}>
          <Route path="/staff" element={<DashboardLayout />}>
            <Route path="dashboard" element={<StaffDashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="quotations" element={<QuotationsPage />} />
            <Route path="quotations/new" element={<QuotationFormPage />} />
            <Route path="quotations/:id" element={<QuotationDetailPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="subscriptions/new" element={<SubscriptionFormPage />} />
            <Route path="subscriptions/:id" element={<SubscriptionDetailPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/new" element={<InvoiceFormPage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="payments/:id" element={<PaymentDetailPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path=":id/detail" element={<StaffPage />} />
          </Route>
        </Route>

        {/* Customer portal */}
        <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
          <Route path="/portal" element={<DashboardLayout />}>
            <Route path="dashboard" element={<PortalDashboardPage />} />
            <Route path="profile" element={<PortalProfilePage />} />
            <Route path="subscriptions" element={<PortalSubscriptionsPage />} />
            <Route path="subscriptions/:id" element={<PortalSubscriptionDetailPage />} />
            <Route path="invoices" element={<PortalInvoicesPage />} />
            <Route path="invoices/:id" element={<PortalInvoiceDetailPage />} />
            <Route path="payments" element={<PortalPaymentsPage />} />
            <Route path="payments/:id" element={<PortalPaymentDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
