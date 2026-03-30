import { useState, useEffect } from 'react'
import { sources as sourcesApi } from '../api'
import toast from 'react-hot-toast'
import { RefreshCw, Database, Globe, Building2, Loader2, Users } from 'lucide-react'

export default function Sources() {
  const [stats, setStats] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)

  async function fetchStats() {
    try {
      const res = await sourcesApi.getStats()
      setStats(res.data)
    } catch {
      toast.error('Failed to load source stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await sourcesApi.sync()
      toast.success(
        `Synced! ${res.data.created} new, ${res.data.updated} updated, ${res.data.skipped} skipped`
      )
      fetchStats()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const totalContacts = stats?.totalContacts || 0
  const countryStats = stats?.byCountry || {}
  const companyTypeStats = stats?.byCompanyType || {}

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contact Sources</h1>
        <p className="mt-1 text-gray-600">
          Sync HR/Manager contacts from the sources folder on the server.
        </p>
      </div>

      {/* Sync Button */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Sync Contacts
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Reads Excel/CSV files from the server sources folder and imports
              contacts into the database.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sync Sources
              </>
            )}
          </button>
        </div>
      </div>

      {/* Total Contacts Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Contacts</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalContacts.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Country Breakdown */}
      {Object.keys(countryStats).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            By Country
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(countryStats).map(([country, count]) => (
              <div
                key={country}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {country}
                  </p>
                  <p className="text-sm text-gray-500">
                    {count.toLocaleString()} contacts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Company Type Breakdown */}
      {Object.keys(companyTypeStats).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            By Company Type
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(companyTypeStats).map(([type, count]) => (
              <div
                key={type}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate capitalize">
                    {type}
                  </p>
                  <p className="text-sm text-gray-500">
                    {count.toLocaleString()} contacts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalContacts === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            No contacts synced yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Click "Sync Sources" to import contacts from the server.
          </p>
        </div>
      )}
    </div>
  )
}
