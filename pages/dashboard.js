import React, { useEffect, useState } from 'react'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import useRequireRole from '../utils/useRequireRole'
import { fetchMetrics } from '../utils/fetchMetrics'

export default function Dashboard() {
  const { authError, loading: authLoading } = useRequireSupabaseAuth()
  const unauthorized = useRequireRole(['admin'])
  const [metrics, setMetrics] = useState(null)
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (unauthorized || authLoading) return
    setLoading(true)
    fetchMetrics()
      .then((res) => {
        setMetrics(res.metrics)
        setErrors(res.errors)
      })
      .catch((err) => {
        console.error('Failed to fetch metrics', err)
        setError('Failed to load metrics.')
      })
      .finally(() => setLoading(false))
  }, [unauthorized, authLoading])

  if (authError) return <div>{authError}</div>
  if (authLoading)
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mr-2"></div>
        Loading...
      </div>
    )
  if (unauthorized) return <div>Not authorized</div>
  if (loading)
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mr-2"></div>
        Loading...
      </div>
    )
  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (!metrics) return null

  return (
    <div className="p-4">
      {errors.length > 0 && (
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 border border-yellow-400 rounded">
          Warning: Some metrics could not be loaded.
        </div>
      )}
      <h2 className="text-xl font-bold mb-4">📈 Metrics at a Glance</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Upcoming Appointments" value={metrics.upcomingAppointments} icon="📅" />
        <MetricCard label="Usage Forms Needed" value={metrics.usageFormsNeeded} icon="📝" />
        <MetricCard label="Low Stock" value={metrics.lowStock} icon="🚨" />
        <MetricCard label="Orders Today" value={metrics.ordersToday} icon="💳" />
        <MetricCard label="Total Revenue" value={`$${Number(metrics.totalRevenue).toFixed(2)}`} icon="💰" />
        <MetricCard label="Appointment Count" value={metrics.appointmentCount} icon="📋" />
      </div>
    </div>
  )
}

const MetricCard = ({ label, value, icon }) => (
  <div className="p-4 bg-white shadow rounded-lg text-center">
    <div className="text-3xl">{icon}</div>
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
)
