

import { useState } from "react";
import { Link } from "react-router-dom";

import {
  Menu,
  X,
  ArrowRight,
  Check,
  ShieldCheck,
  CreditCard,
  Users,
  Package,
  FileText,
  BarChart3,
  Repeat,
  TrendingUp,
  Play,
  Activity,
  CheckCircle2,
  Headphones,
  Lock,
  Sparkles
} from "lucide-react";


const features = [
  {
    icon: Repeat,
    title: "Subscription Management",
    desc: "Manage plans, recurring billing and the complete subscription lifecycle."
  },
  {
    icon: FileText,
    title: "Invoice Management",
    desc: "Create, send and track professional invoices with ease."
  },
  {
    icon: Users,
    title: "Customer Management",
    desc: "Organize customer accounts, profiles and subscription history."
  },
  {
    icon: Package,
    title: "Product Management",
    desc: "Manage products, variants and pricing from one place."
  },
  {
    icon: CreditCard,
    title: "Payment Management",
    desc: "Monitor payments, transactions and payment status."
  },
  {
    icon: BarChart3,
    title: "Revenue Analytics",
    desc: "Understand revenue trends and business performance."
  }
];

const steps = [
  {
    number: "01",
    title: "Set Up",
    desc: "Configure your products, plans and pricing."
  },
  {
    number: "02",
    title: "Go Live",
    desc: "Start managing subscriptions and customers."
  },
  {
    number: "03",
    title: "Grow",
    desc: "Monitor analytics, manage invoices and scale."
  }
];

const plans = [
  {
    name: "Starter",
    description: "For small businesses getting started.",
    price: "Contact Us",
    items: [
      "Product management",
      "Customer management",
      "Basic invoicing",
      "Subscription tracking",
      "Dashboard access"
    ]
  },
  {
    name: "Professional",
    description: "For growing subscription businesses.",
    price: "Contact Us",
    popular: true,
    items: [
      "Everything in Starter",
      "Advanced subscriptions",
      "Payment management",
      "Revenue analytics",
      "Advanced reports",
      "Priority support"
    ]
  },
  {
    name: "Enterprise",
    description: "For businesses with advanced needs.",
    price: "Custom",
    items: [
      "Everything in Professional",
      "Advanced access control",
      "Custom workflows",
      "Dedicated assistance",
      "Advanced reporting",
      "Custom integrations"
    ]
  }
];

const chartData = [35, 48, 40, 65, 52, 75, 60, 90, 72, 100, 82, 95];

function DashboardPreview() {
  return (
    <div className="bl-dashboard">
      <div className="bl-dash-top">
        <div>
          <div className="bl-dash-title">Business Overview</div>
          <div className="bl-dash-subtitle">
            Dashboard preview · Illustrative data
          </div>
        </div>
        <span className="bl-live">
          <span /> Demo
        </span>
      </div>

      <div className="bl-stat-grid">
        <div className="bl-stat">
          <span>Monthly Revenue</span>
          <strong>$24,580</strong>
          <small><TrendingUp size={12} /> +12.5%</small>
        </div>
        <div className="bl-stat">
          <span>Subscriptions</span>
          <strong>1,248</strong>
          <small><TrendingUp size={12} /> +8.2%</small>
        </div>
        <div className="bl-stat">
          <span>Customers</span>
          <strong>856</strong>
          <small><TrendingUp size={12} /> +6.4%</small>
        </div>
      </div>

      <div className="bl-chart-box">
        <div className="bl-chart-heading">
          <strong>Revenue Overview</strong>
          <span>Last 12 months</span>
        </div>

        <div className="bl-chart">
          {chartData.map((height, index) => (
            <div className="bl-chart-column" key={index}>
              <div style={{ height: `${height}%` }} />
            </div>
          ))}
        </div>

        <div className="bl-chart-labels">
          <span>Jan</span>
          <span>Mar</span>
          <span>May</span>
          <span>Jul</span>
          <span>Sep</span>
          <span>Dec</span>
        </div>
      </div>

      <div className="bl-transactions">
        <strong>Recent Transactions</strong>

        <div className="bl-transaction">
          <div className="bl-transaction-icon">
            <CreditCard size={16} />
          </div>
          <span className="bl-transaction-name">Monthly Subscription</span>
          <strong>$249</strong>
          <span className="bl-paid">Paid</span>
        </div>

        <div className="bl-transaction">
          <div className="bl-transaction-icon">
            <FileText size={16} />
          </div>
          <span className="bl-transaction-name">Invoice Payment</span>
          <strong>$580</strong>
          <span className="bl-paid">Paid</span>
        </div>

        <div className="bl-transaction">
          <div className="bl-transaction-icon">
            <Repeat size={16} />
          </div>
          <span className="bl-transaction-name">New Subscription</span>
          <strong>$120</strong>
          <span className="bl-pending">Pending</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="bl-page">

      {/* NAVBAR */}

      <header className="bl-navbar">
        <div className="bl-nav-inner">

          <Link to="/" className="bl-logo" onClick={closeMenu}>
            <span className="bl-logo-icon">B</span>
            Brightloop
            <span>Software</span>
          </Link>

          <button
            type="button"
            className="bl-mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={25} /> : <Menu size={25} />}
          </button>

          <nav className={`bl-nav-links ${menuOpen ? "bl-menu-open" : ""}`}>
            <a href="#home" onClick={closeMenu}>Home</a>
            <a href="#features" onClick={closeMenu}>Features</a>
            <a href="#how-it-works" onClick={closeMenu}>How It Works</a>
            <a href="#pricing" onClick={closeMenu}>Pricing</a>
            <a href="#about" onClick={closeMenu}>About Us</a>
            <a href="#contact" onClick={closeMenu}>Contact Us</a>
          </nav>

          <div className="bl-nav-actions">
            <Link to="/login" className="bl-login">Login</Link>
            <Link to="/register" className="bl-nav-button">
              Get Started <ArrowRight size={16} />
            </Link>
          </div>

        </div>
      </header>

      <main>

        {/* HERO */}

        <section className="bl-hero" id="home">
          <div className="bl-hero-decoration" />

          <div className="bl-hero-container">

            <div className="bl-hero-content">

              <span className="bl-eyebrow">
                <Sparkles size={14} />
                SUBSCRIPTION MANAGEMENT PLATFORM
              </span>

              <h1>
                Manage Your Subscriptions.
                <span> Simplify Your Business.</span>
              </h1>

              <p>
                Manage products, subscription plans, recurring invoices,
                payments and revenue analytics from one powerful platform.
              </p>

              <div className="bl-hero-buttons">
                <Link to="/register" className="bl-primary-button">
                  Get Started <ArrowRight size={17} />
                </Link>

                <a href="#features" className="bl-outline-button">
                  <Play size={16} /> Explore Features
                </a>
              </div>

              <div className="bl-trust">
                <ShieldCheck size={18} />
                Secure subscription and business management
              </div>

            </div>

            <DashboardPreview />

          </div>
        </section>

        {/* FEATURES */}

        <section className="bl-section" id="features">
          <div className="bl-container">

            <div className="bl-section-heading">
              <span className="bl-section-label">OUR FEATURES</span>
              <h2>Everything Your Business Needs</h2>
              <p>
                Powerful tools to manage your entire subscription business
                from one simple platform.
              </p>
            </div>

            <div className="bl-feature-grid">
              {features.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <article className="bl-feature-card" key={index}>
                    <div className="bl-feature-icon">
                      <Icon size={25} />
                    </div>

                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>

                    <a href="#how-it-works">
                      Learn more <ArrowRight size={15} />
                    </a>
                  </article>
                );
              })}
            </div>

          </div>
        </section>

        {/* HOW IT WORKS */}

        <section className="bl-section bl-steps-section" id="how-it-works">
          <div className="bl-container">

            <div className="bl-section-heading">
              <span className="bl-section-label">SIMPLE PROCESS</span>
              <h2>How Brightloop Works</h2>
              <p>
                Get started in three simple steps and manage your
                subscription business efficiently.
              </p>
            </div>

            <div className="bl-steps-grid">
              {steps.map((step) => (
                <article className="bl-step-card" key={step.number}>
                  <span className="bl-step-number">{step.number}</span>
                  <div className="bl-step-line" />
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </article>
              ))}
            </div>

          </div>
        </section>

        {/* PRICING */}

        <section className="bl-section" id="pricing">
          <div className="bl-container">

            <div className="bl-section-heading">
              <span className="bl-section-label">OUR PLANS</span>
              <h2>Plans For Every Business</h2>
              <p>
                Choose a plan that matches your business requirements.
                Contact us for pricing details.
              </p>
            </div>

            <div className="bl-pricing-grid">
              {plans.map((plan) => (
                <article
                  className={`bl-price-card ${plan.popular ? "bl-popular" : ""}`}
                  key={plan.name}
                >
                  {plan.popular && (
                    <span className="bl-popular-label">
                      MOST POPULAR
                    </span>
                  )}

                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>

                  <div className="bl-price">{plan.price}</div>

                  <Link
                    to="/register"
                    className={plan.popular ? "bl-primary-button" : "bl-outline-button"}
                  >
                    Get Started <ArrowRight size={15} />
                  </Link>

                  <div className="bl-price-divider" />

                  <strong>What's included:</strong>

                  <ul>
                    {plan.items.map((item) => (
                      <li key={item}>
                        <Check size={17} /> {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

          </div>
        </section>

        {/* ABOUT */}

        <section className="bl-section bl-about" id="about">
          <div className="bl-container">

            <div className="bl-about-grid">

              <div>
                <span className="bl-section-label">ABOUT BRIGHTLOOP</span>

                <h2>
                  Simplifying Business Management With Technology
                </h2>

                <p>
                  Brightloop Software provides a centralized platform
                  for businesses to manage their products, subscriptions,
                  customers, invoices and payments.
                </p>

                <p>
                  Our goal is to make business operations easier with
                  organized workflows and useful business insights.
                </p>

                <div className="bl-about-points">
                  <span><CheckCircle2 /> Centralized business management</span>
                  <span><Lock /> Secure account access</span>
                  <span><Activity /> Business performance insights</span>
                  <span><Headphones /> Organized customer management</span>
                </div>
              </div>

              <div className="bl-about-visual">
                <DashboardPreview />
              </div>

            </div>

          </div>
        </section>

        {/* CTA */}

        <section className="bl-section bl-cta" id="contact">
          <div className="bl-container">

            <div className="bl-cta-content">
              <div>
                <span className="bl-section-label">
                  GET STARTED TODAY
                </span>

                <h2>Ready To Simplify Your Business?</h2>

                <p>
                  Start managing your products, subscriptions and
                  business operations with Brightloop Software.
                </p>
              </div>

              <Link to="/register" className="bl-white-button">
                Create Your Account <ArrowRight size={17} />
              </Link>
            </div>

          </div>
        </section>

      </main>

      {/* FOOTER */}

      <footer className="bl-footer">
        <div className="bl-container">

          <div className="bl-footer-grid">

            <div>
              <Link to="/" className="bl-logo bl-footer-logo">
                <span className="bl-logo-icon">B</span>
                Brightloop Software
              </Link>

              <p>
                A smarter way to manage subscriptions,
                customers, invoices and business operations.
              </p>
            </div>

            <div>
              <strong>Quick Links</strong>
              <a href="#home">Home</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#about">About Us</a>
            </div>

            <div>
              <strong>Account</strong>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </div>

            <div>
              <strong>Platform</strong>
              <a href="#features">Subscriptions</a>
              <a href="#features">Invoices</a>
              <a href="#features">Payments</a>
              <a href="#features">Analytics</a>
            </div>

          </div>

          <div className="bl-copyright">
            © {new Date().getFullYear()} Brightloop Software.
            All rights reserved.
          </div>

        </div>
      </footer>

    </div>
  );
}
