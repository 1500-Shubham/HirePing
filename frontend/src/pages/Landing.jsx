import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import {
  Sparkles,
  Target,
  ShieldCheck,
  Check,
  ArrowRight,
  Zap,
  Mail,
  User,
  Upload,
  MousePointerClick,
  Send,
} from 'lucide-react'

const steps = [
  {
    num: '01',
    icon: User,
    title: 'Sign in with Google',
    desc: 'One-click login with your Gmail. No passwords, no forms.',
  },
  {
    num: '02',
    icon: Upload,
    title: 'Upload your resume',
    desc: 'AI extracts your skills, experience, and strengths automatically.',
  },
  {
    num: '03',
    icon: MousePointerClick,
    title: 'Choose your targets',
    desc: 'Select which countries you want to reach — India, US, UK, and more.',
  },
  {
    num: '04',
    icon: Send,
    title: 'Hit Send',
    desc: 'AI crafts unique emails for each recipient, sent directly from your Gmail.',
  },
]

const features = [
  {
    icon: Sparkles,
    title: 'AI-Personalized Outreach',
    desc: "Every email is uniquely crafted using your resume and the recipient's context. No templates, no copy-paste — genuine, human-sounding outreach.",
  },
  {
    icon: Target,
    title: 'Direct to Decision-Makers',
    desc: 'Skip job boards. Your email lands directly in the inbox of HRs, CTOs, and hiring managers at companies across 5+ countries.',
  },
  {
    icon: ShieldCheck,
    title: 'Your Gmail, Your Reputation',
    desc: 'Emails are sent from your own Gmail account. Recipients see your real identity — building trust and credibility from the first touchpoint.',
  },
]

const pricingPlans = [
  {
    name: 'Daily',
    price: '29',
    period: '1 day',
    features: [
      'Up to 30 emails',
      'AI-personalized content',
      'Multi-country targeting',
      'Email history & tracking',
      'Pay via UPI',
    ],
  },
  {
    name: 'Weekly',
    price: '149',
    period: '7 days',
    features: [
      'Up to 30 emails per day',
      'AI-personalized content',
      'Multi-country targeting',
      'Email history & tracking',
      'Pay via UPI',
    ],
  },
  {
    name: 'Monthly',
    price: '299',
    period: '30 days',
    popular: true,
    features: [
      'Up to 30 emails per day',
      'AI-personalized content',
      'Multi-country targeting',
      'Email history & tracking',
      'Priority support',
      'Pay via UPI',
      'Best value — save 53%',
    ],
  },
]

const stats = [
  { value: '10,000+', label: 'Contacts' },
  { value: '5+', label: 'Countries' },
  { value: '30', label: 'Emails/Day' },
  { value: 'AI', label: 'Powered' },
]

export default function Landing() {
  const { user, loading } = useAuth()

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-indigo-800 to-purple-800" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(99,102,241,0.2),transparent_50%)]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-40 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 bg-white/10 backdrop-blur-sm rounded-full border border-white/15">
            <Zap className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-medium text-white/90">
              Increase your luck surface area
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
            Your Resume. Their Inbox.
            <br />
            <span className="bg-gradient-to-r from-yellow-200 via-amber-200 to-orange-200 bg-clip-text text-transparent">
              More Interviews.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-8 max-w-2xl mx-auto text-lg sm:text-xl text-indigo-200/90 leading-relaxed">
            HirePing puts your resume directly in front of hiring managers at
            10,000+ companies — personalized, automated, from your own Gmail.
            Stop applying into the void. Start connecting with decision-makers.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/api/auth/google"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-gray-900 text-base font-semibold rounded-xl shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transform hover:-translate-y-0.5 transition-all"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-6 py-4 text-white/80 font-medium rounded-xl border border-white/15 hover:bg-white/5 hover:text-white transition-all"
            >
              See How It Works
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Trust line */}
          <p className="mt-8 text-sm text-indigo-300/70">
            Trusted by job seekers across 5+ countries
          </p>

          {/* Floating stats */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white">
                  {value}
                </div>
                <div className="text-xs sm:text-sm text-indigo-300/80 mt-0.5 font-medium">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0 60L60 55C120 50 240 40 360 37.3C480 34.7 600 39.3 720 48C840 56.7 960 69.3 1080 68.7C1200 68 1320 54 1380 47L1440 40V120H0V60Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase text-indigo-600 bg-indigo-50 rounded-full mb-4">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Four steps to your next interview
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              From sign-in to sending — get started in under two minutes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ num, icon: Icon, title, desc }, i) => (
              <div key={title} className="relative group">
                {/* Connector line (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-indigo-200 to-indigo-100" />
                )}
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center w-20 h-20 mb-5">
                    <div className="absolute inset-0 bg-indigo-50 rounded-2xl group-hover:bg-indigo-100 transition-colors" />
                    <Icon className="relative w-8 h-8 text-indigo-600" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {num}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gray-50/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase text-indigo-600 bg-indigo-50 rounded-full mb-4">
              Why HirePing
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Skip the job board black hole
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              AI writes it, you send it. Go direct to the people who actually hire.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group relative p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {title}
                </h3>
                <p className="text-gray-500 leading-relaxed text-[15px]">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white">
                  {value}
                </div>
                <div className="text-sm text-indigo-200 mt-1 font-medium">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase text-indigo-600 bg-indigo-50 rounded-full mb-4">
              Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              No hidden fees. Pay with UPI. Cancel anytime.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                  plan.popular
                    ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-100/50'
                    : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-extrabold text-gray-900">
                      ₹{plan.price}
                    </span>
                    <span className="text-gray-400 ml-1">/ {plan.period}</span>
                  </div>
                  {/* UPI badge */}
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    <Check className="w-3 h-3" />
                    Pay via UPI
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{feat}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="/api/auth/google"
                  className={`block w-full py-3.5 text-center text-sm font-semibold rounded-xl transition-all duration-200 ${
                    plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/50'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.2),transparent_70%)]" />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
            <Mail className="w-8 h-8 text-indigo-300" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight">
            Your next interview is
            <br />
            <span className="bg-gradient-to-r from-yellow-200 to-amber-200 bg-clip-text text-transparent">
              one ping away
            </span>
          </h2>
          <p className="mt-6 text-lg text-indigo-200/80 max-w-xl mx-auto leading-relaxed">
            Stop waiting for callbacks. Start reaching out to the people who
            actually hire. Join professionals landing interviews at companies
            across India, US, UK, Germany, and more.
          </p>
          <a
            href="/api/auth/google"
            className="group inline-flex items-center gap-3 mt-10 px-10 py-4 bg-white text-gray-900 text-base font-semibold rounded-xl shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transform hover:-translate-y-0.5 transition-all"
          >
            Start for Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">HirePing</span>
          </div>
          <p className="text-sm text-gray-400">
            Built for tech professionals who refuse to wait.
          </p>
        </div>
      </footer>
    </div>
  )
}
