import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Test 1: Authentication
    const user = await requireAuth(req, res)
    if (!user) return

    const testResults = {
      timestamp: new Date().toISOString(),
      auth: {
        userId: user.id,
        email: user.email || 'No email'
      },
      database: {},
      tables: {}
    }

    // Test 2: Basic database connection
    try {
      const { data: dbTest, error: dbError } = await supabase
        .from('bookings')
        .select('count(*)')
        .limit(1)

      testResults.database.connection = dbError ? 'Failed' : 'Success'
      testResults.database.error = dbError?.message || null
    } catch (err) {
      testResults.database.connection = 'Failed'
      testResults.database.error = err.message
    }

    // Test 3: Check table existence and structure
    const tablesToCheck = ['bookings', 'salon_appointments', 'appointments']

    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        testResults.tables[table] = {
          exists: !error,
          error: error?.message || null,
          sampleColumns: data?.[0] ? Object.keys(data[0]) : [],
          rowCount: data?.length || 0
        }
      } catch (err) {
        testResults.tables[table] = {
          exists: false,
          error: err.message,
          sampleColumns: [],
          rowCount: 0
        }
      }
    }

    // Test 4: Check staff profile
    try {
      const { data: profile, error: profileError } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      testResults.profile = {
        exists: !profileError,
        data: profile || null,
        error: profileError?.message || null
      }
    } catch (err) {
      testResults.profile = {
        exists: false,
        data: null,
        error: err.message
      }
    }

    // Test 5: Environment variables check
    testResults.environment = {
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
      publicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      publicSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }

    res.status(200).json({
      success: true,
      results: testResults
    })

  } catch (err) {
    console.error('❌ Database Test Error:', err)
    res.status(500).json({
      error: 'Database test failed',
      details: err.message
    })
  }
}

