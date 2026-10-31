import { Link } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader.jsx';

export default function PrivacyPolicyPage() {
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
        <div className="max-w-2xl mx-auto px-4">
          <PageHeader
            title="Privacy Policy"
            description="Brightloop Software Subscription Management System"
          />

          <div className="policy-content">
            <h1>Privacy Policy</h1>
            <p className="policy-last-updated">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section>
              <h2>Introduction</h2>
              <p>
                Welcome to Brightloop Software's privacy policy. This policy describes
                how we collect, use, disclose, and safeguard your information when you
                visit our website or use our subscription management platform.
              </p>
            </section>

            <section>
              <h2>Information We Collect</h2>
              <h3>Account Information</h3>
              <p>
                When you register for an account, we collect your name, email address,
                and company name. This information is used to create and manage your
                account and provide access to the Brightloop platform.
              </p>

              <h3>Usage Data</h3>
              <p>
                We may collect information about how you access and use the platform,
                including the date and time of access, the pages you view, and other
                diagnostic data. This helps us improve the platform and maintain
                security.
              </p>
            </section>

            <section>
              <h2>How We Use Your Information</h2>
              <ul>
                <li>
                  To create and manage your account
                </li>
                <li>
                  To provide and improve our services
                </li>
                <li>
                  To send administrative communications
                </li>
                <li>
                  To enforce our Terms of Service
                </li>
                <li>
                  To respond to legal requests and protect our rights
                </li>
              </ul>
            </section>

            <section>
              <h2>Data Security</h2>
              <p>
                We implement appropriate data security measures to protect your
                information from unauthorized access, alteration, disclosure, or
                destruction. However, no method of transmission over the internet or
                electronic storage is 100% secure.
              </p>
            </section>

            <section>
              <h2>Your Rights</h2>
              <p>
                You have the right to access, correct, or delete your personal
                information. You may also request that we restrict or object to the
                processing of your data. Please contact us to exercise these rights.
              </p>
            </section>

            <section>
              <h2>Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify
                of any changes by posting the new privacy policy on this page. We
                encourage you to review this policy periodically.
              </p>
            </section>

            <footer className="policy-footer">
              <p>
                If you have questions about this privacy policy, contact us at
                <a href="mailto:privacy@brightloop.com">
                  privacy@brightloop.com
                </a>
              </p>
            </footer>
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
                <li><Link to="/">Home</Link></li>
                <li><Link to="/terms" className="footer-link">Terms & Conditions</Link></li>
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