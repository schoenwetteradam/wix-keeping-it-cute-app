import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  ComposedChart
} from 'recharts'
import {
  TrendingUp,
  DollarSign,
  Settings,
  Clock,
  Users,
  Wrench,
  ArrowLeft,
  RefreshCw,
  Database,
  BarChart3,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

// Lazy initialization to prevent build errors
let supabase = null
function getSupabase() {
  if (!supabase && typeof window !== 'undefined') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && key) {
      supabase = createClient(url, key)
    }
  }
  return supabase
}

export default function Dashboard() {
  const [toolChanges, setToolChanges] = useState([])
  const [operators, setOperators] = useState([])
  const [equipment, setEquipment] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDateRange, setSelectedDateRange] = useState(30)
  const [stats, setStats] = useState({
    todayChanges: 0,
    activeMachines: 0,
    totalChanges: 0,
    avgDowntime: 0,
    totalCost: 0,
    activeOperators: 0,
    efficiency: 0,
    costSavings: 0
  })

  // Chart colors
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16']

  useEffect(() => {
    loadDashboardData()
  }, [selectedDateRange])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const client = getSupabase()
      if (!client) {
        console.error('Supabase client not available')
        setIsLoading(false)
        return
      }

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - selectedDateRange)

      const startDateStr = startDate.toISOString().split('T')[0]
      const todayStr = new Date().toISOString().split('T')[0]

      // Fetch all data
      const [toolChangesResponse, operatorsResponse, equipmentResponse] = await Promise.all([
        client
          .from('tool_changes')
          .select('*')
          .gte('date', startDateStr)
          .order('created_at', { ascending: false }),
        client
          .from('operators')
          .select('*')
          .eq('active', true),
        client
          .from('equipment')
          .select('*')
          .eq('active', true)
      ])

      const changes = toolChangesResponse.data || []
      const ops = operatorsResponse.data || []
      const equip = equipmentResponse.data || []

      setToolChanges(changes)
      setOperators(ops)
      setEquipment(equip)

      // Calculate statistics
      const todayChanges = changes.filter(c => c.date === todayStr).length
      const totalChanges = changes.length
      const totalCost = changes.reduce((sum, c) => sum + (c.total_tool_cost || 0), 0)
      const activeOperators = new Set(changes.map(c => c.operator)).size
      const activeMachines = new Set(changes.map(c => c.equipment_number)).size
      
      // Calculate efficiency as changes per day percentage
      const avgChangesPerDay = totalChanges / selectedDateRange
      const efficiency = Math.min(Math.round(avgChangesPerDay * 20), 100) // Scale to percentage
      
      // Estimate cost savings from preventive changes vs reactive
      const preventiveChanges = changes.filter(c => 
        c.change_reason === 'Scheduled maintenance' || c.change_reason === 'Normal wear'
      ).length
      const reactiveChanges = changes.filter(c => 
        c.change_reason === 'Tool Breakage' || c.change_reason === 'Chipped Edge'
      ).length
      const costSavings = reactiveChanges * 25 // Estimated $25 savings per prevented reactive change

      setStats({
        todayChanges,
        activeMachines,
        totalChanges,
        avgDowntime: 0, // Not tracking downtime in current data
        totalCost: Math.round(totalCost),
        activeOperators,
        efficiency,
        costSavings
      })

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Process data for charts
  const processChartData = () => {
    if (!toolChanges.length) return { timelineData: [], reasonData: [], operatorData: [], insertData: [] }

    // Timeline data - show last 30 days max
    const days = Array.from({ length: Math.min(selectedDateRange, 30) }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    const timelineData = days.map(date => {
      const dayChanges = toolChanges.filter(change => change.date === date)
      const dayRoughers = dayChanges.filter(c => c.first_rougher_action === 'Replace').length
      const dayFinishers = dayChanges.filter(c => c.finish_tool_action === 'Replace').length
      const dayCost = dayChanges.reduce((sum, c) => sum + (c.total_tool_cost || 0), 0)
      
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        changes: dayChanges.length,
        roughers: dayRoughers,
        finishers: dayFinishers,
        cost: Math.round(dayCost)
      }
    })

    // Change reasons
    const reasonCounts = {}
    toolChanges.forEach(change => {
      if (change.change_reason) {
        reasonCounts[change.change_reason] = (reasonCounts[change.change_reason] || 0) + 1
      }
    })

    const reasonData = Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason: reason.length > 15 ? reason.substring(0, 15) + '...' : reason,
        count,
        fullReason: reason
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    // Operator performance
    const operatorStats = {}
    toolChanges.forEach(change => {
      if (change.operator) {
        if (!operatorStats[change.operator]) {
          operatorStats[change.operator] = {
            changes: 0,
            totalCost: 0,
            rougherChanges: 0,
            finisherChanges: 0
          }
        }
        operatorStats[change.operator].changes++
        operatorStats[change.operator].totalCost += change.total_tool_cost || 0
        if (change.first_rougher_action === 'Replace') operatorStats[change.operator].rougherChanges++
        if (change.finish_tool_action === 'Replace') operatorStats[change.operator].finisherChanges++
      }
    })

    const operatorData = Object.entries(operatorStats)
      .map(([operator, stats]) => ({
        operator: operator.split(' ')[0] || operator, // First name only for chart
        changes: stats.changes,
        avgCost: stats.changes > 0 ? Math.round(stats.totalCost / stats.changes) : 0,
        roughers: stats.rougherChanges,
        finishers: stats.finisherChanges
      }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 8)

    // Insert usage data
    const rougherCounts = {}
    const finisherCounts = {}
    
    toolChanges.forEach(change => {
      if (change.new_rougher_material_id && change.first_rougher_action === 'Replace') {
        rougherCounts[change.new_rougher_material_id] = (rougherCounts[change.new_rougher_material_id] || 0) + 1
      }
      if (change.new_finish_material_id && change.finish_tool_action === 'Replace') {
        finisherCounts[change.new_finish_material_id] = (finisherCounts[change.new_finish_material_id] || 0) + 1
      }
    })

    const insertData = [
      ...Object.entries(rougherCounts).map(([insert, count]) => ({
        name: insert || 'Unknown',
        value: count,
        type: 'Rougher'
      })),
      ...Object.entries(finisherCounts).map(([insert, count]) => ({
        name: insert || 'Unknown',
        value: count,
        type: 'Finisher'
      }))
    ]

    return { timelineData, reasonData, operatorData, insertData }
  }

  const { timelineData, reasonData, operatorData, insertData } = processChartData()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin h-6 w-6 text-blue-600" />
          <span className="text-lg text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft size={20} />
                <span>Back to Form</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">📊 Manufacturing Tool Analytics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button
                onClick={loadDashboardData}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <RefreshCw size={16} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Quick Status Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tool Changes Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayChanges}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Machines</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeMachines}</p>
              </div>
              <Settings className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cost Savings</p>
                <p className="text-2xl font-bold text-gray-900">${stats.costSavings}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Efficiency</p>
                <p className="text-2xl font-bold text-gray-900">{stats.efficiency}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tool Changes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalChanges}</p>
                <p className="text-sm text-gray-500">Last {selectedDateRange} days</p>
              </div>
              <Wrench className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost Impact</p>
                <p className="text-3xl font-bold text-gray-900">${stats.totalCost}</p>
                <p className="text-sm text-gray-500">Insert + downtime costs</p>
              </div>
              <DollarSign className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Operators</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeOperators}</p>
                <p className="text-sm text-gray-500">Recording changes</p>
              </div>
              <Users className="h-12 w-12 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tool Changes Over Time</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="changes" fill="#3B82F6" name="Total Changes" />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#F59E0B" 
                    name="Daily Cost ($)"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Change Reasons */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Reasons</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="reason" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Operator Performance and Insert Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Operator Performance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Operator Performance Analysis</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={operatorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="operator" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="changes" fill="#3B82F6" name="Total Changes" />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="avgCost" 
                    stroke="#EF4444" 
                    name="Avg Cost ($)"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insert Usage Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Insert Usage Distribution</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={insertData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {insertData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Tool Changes Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Tool Changes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {toolChanges.slice(0, 10).map((change) => (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {change.date} {change.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {change.operator || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {change.equipment_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {change.part_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        change.change_reason === 'Tool Breakage' ? 'bg-red-100 text-red-800' :
                        change.change_reason === 'Normal wear' ? 'bg-green-100 text-green-800' :
                        change.change_reason === 'Scheduled maintenance' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {change.change_reason || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ${change.total_tool_cost || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {toolChanges.length === 0 && (
              <div className="text-center py-12">
                <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-500 mb-2">No tool changes found</p>
                <p className="text-gray-400">Submit some test data using the form to see analytics here!</p>
                <Link href="/" className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go to Tool Change Form
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
