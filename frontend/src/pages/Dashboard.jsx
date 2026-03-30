import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { plans as plansApi, emails as emailsApi, sources as sourcesApi } from '../api'
import toast from 'react-hot-toast'
import {
  CreditCard,
  Mail,
  Users,
  Upload,
  Send,
  ShoppingCart,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [planStatus, setPlanStatus] = useState(null)
  const [emailHistory, setEmailHistory] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [planRes, emailRes, statsRes, emailStatsRes] = await Promise.allSettled([
          plansApi.getStatus(),
          emailsApi.getHistory(),
          sourcesApi.getStats(),
          emailsApi.getStats(),
        ])
        if (planRes.status === 'fulfilled') setPlanStatus(planRes.value.data)
        if (emailRes.status === 'fulfilled') setEmailHistory(emailRes.value.data.emails || [])
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
        if (emailStatsRes.status === 'fulfilled') setStats(prev => ({ ...prev, ...emailStatsRes.value.data }))
      } catch (err) {
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const isAdmin = user?.isAdmin === true
  const isActive = isAdmin || planStatus?.active
  const expiresAt = planStatus?.expiresAt
    ? new Date(planStatus.expiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null
  const emailsSentToday = planStatus?.emailsSentToday ?? 0
  const totalContacts = stats?.totalContacts ?? 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-1 text-gray-600">
            Here's an overview of your job application campaign.
          </p>
        </div>
        {isAdmin && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            SUPERADMIN
          </span>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Plan Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-600" />
            </div>
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-600 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" />
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500">Plan Status</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {isAdmin
              ? 'Admin'
              : planStatus?.planType
                ? planStatus.planType.charAt(0).toUpperCase() +
                  planStatus.planType.slice(1)
                : 'No Plan'}
          </p>
          {isAdmin ? (
            <p className="text-xs text-amber-600 mt-2 font-medium">Unlimited access</p>
          ) : expiresAt ? (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Expires {expiresAt}
            </p>
          ) : null}
        </div>

        {/* Emails Today */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500">Emails Sent Today</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <p className="text-2xl font-bold text-gray-900">{emailsSentToday}</p>
            {!isAdmin && <p className="text-sm text-gray-400">/ 30</p>}
            {isAdmin && <p className="text-sm text-amber-500 font-medium">unlimited</p>}
          </div>
          {!isAdmin && (
            <div className="mt-3 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${Math.min((emailsSentToday / 30) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Total Contacts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500">
            Total Contacts
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {totalContacts.toLocaleString()}
          </p>
        </div>

        {/* Total Emails Sent (all time) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500">
            Total Emails Sent
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {(stats?.totalSent ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Upload Resume
              </p>
              <p className="text-xs text-gray-500">
                Update your profile data
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate('/emails')}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left"
          >
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Send className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Send Emails
              </p>
              <p className="text-xs text-gray-500">
                Start your campaign
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate('/plans')}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left"
          >
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Buy Plan</p>
              <p className="text-xs text-gray-500">
                Activate email sending
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Emails */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Emails
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {emailHistory.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">
                No emails sent yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Your sent email history will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left font-medium text-gray-500 px-5 py-3">
                      To
                    </th>
                    <th className="text-left font-medium text-gray-500 px-5 py-3">
                      Subject
                    </th>
                    <th className="text-left font-medium text-gray-500 px-5 py-3">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {emailHistory.slice(0, 10).map((email, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-gray-900">
                        {email.to}
                      </td>
                      <td className="px-5 py-3 text-gray-600 truncate max-w-xs">
                        {email.subject}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {new Date(email.sentAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
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
