import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  emails as emailsApi,
  sources as sourcesApi,
  plans as plansApi,
} from '../api'
import toast from 'react-hot-toast'
import {
  Send,
  Loader2,
  Mail,
  Globe,
  Save,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  Eye,
  Hash,
  ShieldCheck,
} from 'lucide-react'

export default function Emails() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.isAdmin === true

  const [countries, setCountries] = useState([])
  const [selectedCountries, setSelectedCountries] = useState([])
  const [planStatus, setPlanStatus] = useState(null)
  const [emailHistory, setEmailHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  // Admin-specific state
  const [emailCount, setEmailCount] = useState(10)
  const [previewSources, setPreviewSources] = useState([])
  const [previewing, setPreviewing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [countriesRes, planRes, historyRes] = await Promise.allSettled([
          sourcesApi.getCountries(),
          plansApi.getStatus(),
          emailsApi.getHistory(),
        ])
        if (countriesRes.status === 'fulfilled') {
          setCountries(countriesRes.value.data.countries || [])
        }
        if (planRes.status === 'fulfilled') {
          setPlanStatus(planRes.value.data)
        }
        if (historyRes.status === 'fulfilled') {
          setEmailHistory(historyRes.value.data.emails || [])
        }
      } catch {
        toast.error('Failed to load email data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const canSend = isAdmin || planStatus?.status === 'active'

  const toggleCountry = (country) => {
    setSelectedCountries((prev) =>
      prev.includes(country)
        ? prev.filter((c) => c !== country)
        : [...prev, country]
    )
    setShowPreview(false)
    setPreviewSources([])
  }

  const savePreferences = async () => {
    setSavingPrefs(true)
    try {
      await emailsApi.updateCountries(selectedCountries)
      toast.success('Country preferences saved')
    } catch {
      toast.error('Failed to save preferences')
    } finally {
      setSavingPrefs(false)
    }
  }

  const handlePreview = async () => {
    if (selectedCountries.length === 0) {
      toast.error('Select at least one country first')
      return
    }
    setPreviewing(true)
    try {
      // Save countries first so backend knows
      await emailsApi.updateCountries(selectedCountries)
      const res = await emailsApi.preview(emailCount)
      setPreviewSources(res.data.sources || [])
      setShowPreview(true)
      toast.success(`Showing ${res.data.selected} of ${res.data.total} available sources`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch preview')
    } finally {
      setPreviewing(false)
    }
  }

  const handleSendEmails = async () => {
    if (!canSend) {
      toast.error('You need an active plan to send emails')
      return
    }
    if (selectedCountries.length === 0) {
      toast.error('Select at least one country first')
      return
    }
    setSending(true)
    setSendResult(null)
    try {
      // Save countries first
      await emailsApi.updateCountries(selectedCountries)
      const res = await emailsApi.send(isAdmin ? emailCount : null)
      setSendResult(res.data)
      toast.success(`Sent ${res.data.sentCount} emails!`)
      // Refresh history
      const historyRes = await emailsApi.getHistory()
      setEmailHistory(historyRes.value?.data?.emails || historyRes.data?.emails || [])
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send emails'
      toast.error(msg)
      setSendResult({ error: msg })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emails</h1>
          <p className="mt-1 text-gray-600">
            Configure targeting and send personalized job application emails.
          </p>
        </div>
        {isAdmin && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            SUPERADMIN
          </span>
        )}
      </div>

      {/* No Plan CTA — only for non-admin */}
      {!canSend && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800">
                No active plan
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                You need an active plan to send emails.
              </p>
              <button
                onClick={() => navigate('/plans')}
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Buy a Plan
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Country Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <Globe className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Target Countries
          </h2>
        </div>

        {countries.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No source contacts available. Ask admin to sync sources.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
            {countries.map((c) => (
              <label
                key={c._id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedCountries.includes(c._id)
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={selectedCountries.includes(c._id)}
                    onChange={() => toggleCountry(c._id)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {c._id}
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  {c.count}
                </span>
              </label>
            ))}
          </div>
        )}

        <button
          onClick={savePreferences}
          disabled={savingPrefs}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          {savingPrefs ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {savingPrefs ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Send Emails — with admin controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Send Emails
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          {isAdmin
            ? 'Superadmin — unlimited sending. Choose how many to send.'
            : 'Send up to 30 personalized emails to hiring managers today.'}
        </p>

        {/* Admin: email count input + preview button */}
        {isAdmin && (
          <div className="mb-5 p-4 bg-amber-50/50 border border-amber-100 rounded-lg space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">
                  How many emails?
                </label>
              </div>
              <input
                type="number"
                min="1"
                max="9999"
                value={emailCount}
                onChange={(e) => {
                  setEmailCount(parseInt(e.target.value) || 1)
                  setShowPreview(false)
                }}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handlePreview}
                disabled={previewing || selectedCountries.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                {previewing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                Preview Sources
              </button>
            </div>
          </div>
        )}

        {/* Source Preview Table */}
        {showPreview && previewSources.length > 0 && (
          <div className="mb-5 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700">
                Sending to {previewSources.length} source(s):
              </p>
            </div>
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-500 px-4 py-2">#</th>
                    <th className="text-left font-medium text-gray-500 px-4 py-2">Name</th>
                    <th className="text-left font-medium text-gray-500 px-4 py-2">Email</th>
                    <th className="text-left font-medium text-gray-500 px-4 py-2">Role</th>
                    <th className="text-left font-medium text-gray-500 px-4 py-2">Company</th>
                    <th className="text-left font-medium text-gray-500 px-4 py-2">Country</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewSources.map((s, i) => (
                    <tr key={s._id || i} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2 text-gray-900 font-medium">{s.name}</td>
                      <td className="px-4 py-2 text-gray-600">{s.email}</td>
                      <td className="px-4 py-2 text-gray-600">{s.role}</td>
                      <td className="px-4 py-2 text-gray-600">{s.company}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                          {s.country}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSendEmails}
          disabled={sending || !canSend || selectedCountries.length === 0}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send {isAdmin ? emailCount : ''} Emails Now
            </>
          )}
        </button>

        {/* Send Result */}
        {sendResult && !sendResult.error && (
          <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm font-semibold text-green-800">
                Successfully sent {sendResult.sentCount} email(s)
              </p>
            </div>
            {sendResult.emails && sendResult.emails.length > 0 && (
              <div className="mt-2 space-y-1">
                {sendResult.emails.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs text-green-700">
                    {e.toName || e.to} ({e.company}) — {e.subject}
                  </p>
                ))}
                {sendResult.emails.length > 5 && (
                  <p className="text-xs text-green-600">
                    ...and {sendResult.emails.length - 5} more
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        {sendResult?.error && (
          <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm font-medium text-red-700">
                {sendResult.error}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Email History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Email History
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {emailHistory.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">
                No emails sent yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left font-medium text-gray-500 px-5 py-3">To</th>
                    <th className="text-left font-medium text-gray-500 px-5 py-3">Subject</th>
                    <th className="text-left font-medium text-gray-500 px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {emailHistory.map((email, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-gray-900 font-medium">{email.to}</td>
                      <td className="px-5 py-3 text-gray-600 truncate max-w-xs">{email.subject}</td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(email.sentAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
