import React, { useEffect, useState } from 'react'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import useRequireRole from '../utils/useRequireRole'
import { fetchMetrics } from '../utils/fetchMetrics'

export default function Dashboard() {
  useRequireSupabaseAuth()
  useRequireRole(['admin'])
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    fetchMetrics().then(setMetrics)
  }, [])

  if (!metrics) return <div>Loading metrics...</div>

  return (
    <div className="p-4">
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
