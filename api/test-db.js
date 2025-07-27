import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // Test simple query
    const { data, error } = await supabase
      .from('customers')
      .select('count(*)')
      .single()
    
    if (error) {
      console.error('❌ Database Error:', error)
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        details: error
      })
    }
    
    // Test insert
    const testCustomer = {
      email: `test-${Date.now()}@test.com`,
      first_name: 'Test',
      last_name: 'Customer',
      business_type: 'salon'
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('customers')
      .insert([testCustomer])
      .select()
    
    if (insertError) {
      console.error('❌ Insert Error:', insertError)
      return res.status(500).json({ 
        success: false, 
        error: insertError.message,
        details: insertError
      })
    }
    
    console.log('✅ Database test successful!')
    
    res.status(200).json({ 
      success: true,
      message: 'Database connection working!',
      test_customer: insertData[0],
      timestamp: new Date().toISOString()
    })
    
  } catch (err) {
    console.error('❌ Unexpected Error:', err)
    res.status(500).json({ 
      success: false,
      error: 'Unexpected error',
      details: err.message,
      stack: err.stack
    })
  }
}
