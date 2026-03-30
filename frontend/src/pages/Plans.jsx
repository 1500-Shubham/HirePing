import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { plans as plansApi } from '../api'
import toast from 'react-hot-toast'
import {
  Check,
  Loader2,
  Clock,
  CheckCircle2,
  Crown,
  ShieldCheck,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  CreditCard,
} from 'lucide-react'

const planOptions = [
  {
    type: 'weekly',
    name: 'Weekly',
    price: 200,
    period: '7 days',
    features: [
      '30 personalized emails/day',
      'AI-crafted unique content',
      'Multi-country targeting',
      'Sent from your Gmail',
      'Email history tracking',
    ],
  },
  {
    type: 'monthly',
    name: 'Monthly',
    price: 600,
    period: '30 days',
    popular: true,
    saveBadge: 'Save 43%',
    features: [
      '30 personalized emails/day',
      'AI-crafted unique content',
      'Multi-country targeting',
      'Sent from your Gmail',
      'Email history tracking',
    ],
  },
]

export default function Plans() {
  const { user } = useAuth()
  const isAdmin = user?.isAdmin === true
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(null)

  // Payment config from backend
  const [razorpayEnabled, setRazorpayEnabled] = useState(false)
  const [razorpayKeyId, setRazorpayKeyId] = useState('')
  const [upiId, setUpiId] = useState('')

  // Manual UPI fallback state
  const [manualPlan, setManualPlan] = useState(null)
  const [utrInput, setUtrInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const paymentRef = useRef(null)

  useEffect(() => {
    Promise.all([plansApi.getStatus(), plansApi.getAll()])
      .then(([statusRes, plansRes]) => {
        setStatus(statusRes.data)
        setRazorpayEnabled(plansRes.data.razorpayEnabled || false)
        setRazorpayKeyId(plansRes.data.razorpayKeyId || '')
        setUpiId(plansRes.data.upiId || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Load Razorpay script dynamically
  const loadRazorpayScript = useCallback(() => {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-script')) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.id = 'razorpay-script'
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }, [])

  // Razorpay payment flow
  const handleRazorpayPay = async (plan) => {
    setPaying(plan.type)

    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway. Try again.')
        setPaying(null)
        return
      }

      // Create order on backend
      const { data } = await plansApi.createOrder(plan.type)

      const options = {
        key: razorpayKeyId,
        amount: data.amount,
        currency: data.currency,
        name: 'HirePing',
        description: `${plan.name} Plan — ${plan.period}`,
        order_id: data.orderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#4f46e5',
        },
        handler: async (response) => {
          // Payment successful — verify on backend
          try {
            const verifyRes = await plansApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planType: plan.type,
            })
            setStatus(verifyRes.data)
            toast.success(`${plan.name} plan activated! Happy applying!`)
          } catch {
            toast.error('Payment received but verification failed. Contact support.')
          }
          setPaying(null)
        },
        modal: {
          ondismiss: () => {
            setPaying(null)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response) => {
        toast.error(response.error?.description || 'Payment failed. Please try again.')
        setPaying(null)
      })
      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate payment.')
      setPaying(null)
    }
  }

  // Manual UPI fallback
  const handleManualPay = (plan) => {
    setManualPlan(plan)
    setUtrInput('')
    setCopied(false)
    setTimeout(() => {
      paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(upiId)
      setCopied(true)
      toast.success('UPI ID copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleConfirmManual = async () => {
    if (!utrInput.trim() || !manualPlan) return
    setSubmitting(true)
    try {
      const res = await plansApi.purchase(manualPlan.type, utrInput.trim())
      setStatus(res.data)
      toast.success(`${manualPlan.name} plan activated!`)
      setManualPlan(null)
      setUtrInput('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to activate plan.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePay = (plan) => {
    if (razorpayEnabled) {
      handleRazorpayPay(plan)
    } else {
      handleManualPay(plan)
    }
  }

  const isActive = status?.status === 'active'
  const activePlanType = status?.plan?.type
  const expiresAt = status?.plan?.expiresAt
    ? new Date(status.plan.expiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null
  const daysRemaining = status?.daysRemaining || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
        <p className="mt-1 text-gray-600">
          Choose a plan to start sending automated job application emails.
        </p>
      </div>

      {/* Admin Banner */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-6 h-6 text-yellow-200" />
            <h2 className="text-lg font-semibold">Superadmin Access</h2>
            <span className="ml-auto px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase">
              Unlimited
            </span>
          </div>
          <p className="text-amber-100">
            You have <span className="font-bold text-white">unlimited access</span> — no
            subscription needed.
          </p>
        </div>
      )}

      {/* Active Plan */}
      {!isAdmin && isActive && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-6 h-6 text-yellow-300" />
            <h2 className="text-lg font-semibold">Active Plan</h2>
          </div>
          <p className="text-indigo-100">
            You're on the{' '}
            <span className="font-bold text-white">
              {activePlanType?.charAt(0).toUpperCase() + activePlanType?.slice(1)}
            </span>{' '}
            plan.
          </p>
          <div className="mt-2 flex items-center gap-4">
            {expiresAt && (
              <p className="flex items-center gap-1.5 text-sm text-indigo-200">
                <Clock className="w-4 h-4" />
                Active until {expiresAt}
              </p>
            )}
            {daysRemaining > 0 && (
              <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
              </span>
            )}
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid sm:grid-cols-2 gap-6">
        {planOptions.map((plan) => {
          const isCurrentPlan = isActive && activePlanType === plan.type
          const isPaying = paying === plan.type

          return (
            <div
              key={plan.type}
              className={`relative bg-white rounded-2xl border-2 p-8 transition-all ${
                isCurrentPlan
                  ? 'border-green-500 shadow-lg shadow-green-50'
                  : plan.popular
                    ? 'border-indigo-600 shadow-lg shadow-indigo-50'
                    : 'border-gray-100 shadow-sm hover:shadow-md'
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </div>
              )}
              {!isCurrentPlan && plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                {plan.saveBadge && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                    {plan.saveBadge}
                  </span>
                )}
                <div className="mt-3 flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900">₹{plan.price}</span>
                  <span className="text-gray-500">/ {plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePay(plan)}
                disabled={isPaying || isCurrentPlan || isAdmin}
                className={`w-full py-3 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isCurrentPlan
                    ? 'bg-green-50 text-green-700 cursor-default'
                    : isAdmin
                      ? 'bg-gray-50 text-gray-400 cursor-default'
                      : plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
                        : 'bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50'
                }`}
              >
                {isPaying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Opening payment...
                  </>
                ) : isCurrentPlan ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Current Plan
                  </>
                ) : isAdmin ? (
                  'Not needed — Admin'
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pay ₹{plan.price}
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Manual UPI Fallback Section */}
      {manualPlan && !razorpayEnabled && (
        <div ref={paymentRef} className="bg-white rounded-xl border-2 border-indigo-200 shadow-lg p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Complete Payment</h3>
              <p className="text-sm text-gray-500">
                {manualPlan.name} Plan — ₹{manualPlan.price}
              </p>
            </div>
            <button
              onClick={() => { setManualPlan(null); setUtrInput('') }}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* UPI ID */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Pay to UPI ID:</p>
            <div
              onClick={handleCopyUpi}
              className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <code className="text-sm font-mono font-semibold text-gray-900">{upiId}</code>
              <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </div>
          </div>

          {/* UPI deep link */}
          <a
            href={`upi://pay?pa=${encodeURIComponent(upiId)}&pn=HirePing&am=${manualPlan.price}&cu=INR&tn=HirePing+${manualPlan.name}+Plan`}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in UPI App
          </a>

          {/* Steps */}
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-700">Steps:</p>
            <p>1. Open GPay / PhonePe / Paytm</p>
            <p>2. Send ₹{manualPlan.price} to the UPI ID above</p>
            <p>3. Enter the transaction ID / UTR from your payment confirmation</p>
          </div>

          {/* UTR input */}
          <div>
            <label className="text-sm font-medium text-gray-700">Transaction ID / UTR Number</label>
            <input
              type="text"
              value={utrInput}
              onChange={(e) => setUtrInput(e.target.value)}
              placeholder="e.g. 412345678901"
              className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleConfirmManual}
              disabled={submitting || utrInput.trim().length < 4}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {submitting ? 'Confirming...' : 'Confirm Payment'}
            </button>
            <button
              onClick={() => { setManualPlan(null); setUtrInput('') }}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Payment method note */}
      {!isAdmin && (
        <p className="text-center text-xs text-gray-400">
          {razorpayEnabled
            ? 'Payments secured by Razorpay. UPI, cards, and netbanking accepted.'
            : 'Pay via UPI (GPay, PhonePe, Paytm). Plan activates instantly.'}
        </p>
      )}
    </div>
  )
}
