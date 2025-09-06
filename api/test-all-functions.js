import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  const tests = []
  
  try {
    // Test 1: Staff revenue function
    const { data: revenueData, error: revenueError } = await supabase
      .rpc('staff_revenue_by_user', { p_user_id: null })
    
    tests.push({
      name: 'Staff Revenue Function',
      status: revenueError ? 'FAILED' : 'PASSED',
      error: revenueError?.message,
      data: revenueData?.slice(0, 2) // First 2 records
    })

    // Test 2: Bookings query
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .order('appointment_date', { ascending: false })
      .limit(5)
    
    tests.push({
      name: 'Bookings Query',
      status: bookingsError ? 'FAILED' : 'PASSED',
      error: bookingsError?.message,
      count: bookingsData?.length
    })

    // Test 3: Products low stock
    const { data: lowStockData, error: stockError } = await supabase
      .from('products')
      .select('product_name, current_stock, min_threshold')
      .lte('current_stock', supabase.raw('min_threshold'))
      .eq('is_active', true)
    
    tests.push({
      name: 'Low Stock Alert',
      status: stockError ? 'FAILED' : 'PASSED',
      error: stockError?.message,
      lowStockItems: lowStockData?.length || 0
    })

    const overallStatus = tests.every(t => t.status === 'PASSED') ? 'ALL_PASSED' : 'SOME_FAILED'
    
    res.json({
      timestamp: new Date().toISOString(),
      overallStatus,
      tests,
      nextSteps: overallStatus === 'ALL_PASSED' ? 
        ['System is healthy!', 'Ready for Phase 2'] : 
        ['Fix failed tests', 'Check error messages']
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
