import { Link } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader.jsx';

export default function TermsPage() {
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
            title="Terms & Conditions"
            description="Brightloop Software Subscription Management System"
          />

          <div className="policy-content">
            <h1>Terms & Conditions</h1>
            <p className="policy-last-updated">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section>
              <h2>Acceptance of Terms</h2>
              <p>
                By accessing or using the Brightloop Software Subscription Management
                System (the "Service"), you agree to be bound by these Terms &
amp; Conditions. If you disagree with any part of these terms, you may not
                use the Service.
              </p>
            </section>

            <section>
              <h2>Definitions</h2>
              <p>
                "Brightloop," "we," or "our" refers to Brightloop Software. "User," "you,"
                or "your" refers to any individual or entity accessing or using the
                Service.
              </p>
            </section>

            <section>
              <h2>Use of the Service</h2>
              <p>
                You agree to use the Service only for lawful purposes and in accordance
                with these Terms. You are responsible for maintaining the confidentiality
                of your account credentials and for all activities that occur under your
                account.
              </p>
              <ul>
                <li>
                  You must be at least 18 years of age to use the Service.
                </li>
                <li>
                  You must not use the Service for any illegal or unauthorized purpose.
                </li>
                <li>
                  You must not reproduce, distribute, or modify any part of the Service.
                </li>
              </ul>
            </section>

            <section>
              <h2>Subscription & Billing</h2>
              <p>
                All subscription fees are stated in USD and are payable in advance.
                Subscriptions automatically renew unless canceled at least 24 hours
                before the end of the current period. Refunds are at the discretion
                of Brightloop Software.
              </p>
            </section>

            <section>
              <h2>Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are
                and will remain the exclusive property of Brightloop Software and its
                licensors. The Service is protected by copyright, trademark, and other
                laws both within and outside of the United States.
              </p>
            </section>

            <section>
              <h2>Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by applicable law, Brightloop Software,
                its affiliates, agents, officers, employees, licensors, and suppliers
                shall not be liable for any indirect, incidental, special, consequential
                or punitive damages, including without limitation, loss of profits, data,
                or usage, arising out of or in any way connected with the use or
                inability to use the Service.
              </p>
            </section>

            <section>
              <h2>General Provisions</h2>
              <p>
                These Terms constitute the entire agreement between Brightloop Software
                and you concerning the Service, and supersede any and all prior or
                contemporaneous agreements, representations, or warranties, whether
                oral or written, concerning the Service.
              </p>
              <p>
                Our failure to exercise or enforce any right or provision of these
                Terms shall not constitute a waiver of such right or provision.
                These Terms are governed by and construed in accordance with the laws
                of the jurisdiction where Brightloop Software is operating.
              </p>
            </section>

            <footer className="policy-footer">
              <p>
                If you have questions about these Terms & Conditions, contact us
                at <a href="mailto:terms@brightloop.com">terms@brightloop.com</a>
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
                <li><Link to="/privacy" className="footer-link">Privacy Policy</Link></li>
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