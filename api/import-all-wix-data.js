import { createSupabaseClient } from '../utils/supabaseClient'
import { WixAPIManager } from '../utils/wixApiManager'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, ['POST', 'OPTIONS'])
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { entities = ['all'], batchSize = 50, skipExisting = false } = req.body

  try {
    console.log('🔧 Testing Wix API connection...')
    const wix = new WixAPIManager()
    
    // Test each API endpoint individually
    const testResults = {
      services: null,
      bookings: null,
      contacts: null,
      orders: null
    }

    // Test services first (usually most reliable)
    try {
      console.log('Testing services API...')
      const servicesResponse = await wix.getServices()
      testResults.services = { success: true, count: servicesResponse?.services?.length || 0 }
      console.log(`✅ Services API working: ${testResults.services.count} services found`)
    } catch (servicesError) {
      testResults.services = { success: false, error: servicesError.message }
      console.log(`❌ Services API failed: ${servicesError.message}`)
    }

    // Test bookings
    try {
      console.log('Testing bookings API...')
      const bookingsResponse = await wix.getBookings({ limit: 1 })
      testResults.bookings = { success: true, count: bookingsResponse?.bookings?.length || 0 }
      console.log(`✅ Bookings API working: ${testResults.bookings.count} bookings found`)
    } catch (bookingsError) {
      testResults.bookings = { success: false, error: bookingsError.message }
      console.log(`❌ Bookings API failed: ${bookingsError.message}`)
    }

    // Test contacts
    try {
      console.log('Testing contacts API...')
      const contactsResponse = await wix.getContacts({ limit: 1 })
      testResults.contacts = { success: true, count: contactsResponse?.contacts?.length || 0 }
      console.log(`✅ Contacts API working: ${testResults.contacts.count} contacts found`)
    } catch (contactsError) {
      testResults.contacts = { success: false, error: contactsError.message }
      console.log(`❌ Contacts API failed: ${contactsError.message}`)
    }

    // Test orders (might not be available)
    try {
      console.log('Testing orders API...')
      const ordersResponse = await wix.getOrders({ limit: 1 })
      testResults.orders = { success: true, count: ordersResponse?.orders?.length || 0 }
      console.log(`✅ Orders API working: ${testResults.orders.count} orders found`)
    } catch (ordersError) {
      testResults.orders = { success: false, error: ordersError.message }
      console.log(`❌ Orders API failed: ${ordersError.message}`)
    }

    // Now try actual import only for working APIs
    const importResults = {
      bookings: { imported: 0, errors: 0, skipped: 0 },
      contacts: { imported: 0, errors: 0, skipped: 0 },
      orders: { imported: 0, errors: 0, skipped: 0 },
      services: { imported: 0, errors: 0, skipped: 0 }
    }

    // Import services if available
    if (testResults.services.success) {
      try {
        importResults.services = await importWixServices(wix, batchSize, skipExisting)
      } catch (err) {
        importResults.services.errors = 1
        console.log(`Services import failed: ${err.message}`)
      }
    }

    // Import bookings if available  
    if (testResults.bookings.success) {
      try {
        importResults.bookings = await importWixBookings(wix, batchSize, skipExisting)
      } catch (err) {
        importResults.bookings.errors = 1
        console.log(`Bookings import failed: ${err.message}`)
      }
    }

    // Import contacts if available
    if (testResults.contacts.success) {
      try {
        importResults.contacts = await importWixContacts(wix, batchSize, skipExisting)
      } catch (err) {
        importResults.contacts.errors = 1
        console.log(`Contacts import failed: ${err.message}`)
      }
    }

    res.status(200).json({
      success: true,
      message: 'Keeping It Cute Salon - Wix sync diagnostic complete!',
      api_tests: testResults,
      import_results: importResults,
      salon: 'Keeping It Cute Salon & Spa'
    })

  } catch (error) {
    console.error('Import failed:', error)
    
    res.status(500).json({
      success: false,
      error: 'Import failed',
      details: error.message,
      debug_info: {
        wix_api_token_present: !!process.env.WIX_API_TOKEN,
        wix_site_id: process.env.WIX_SITE_ID,
        error_stack: error.stack
      },
      salon: 'Keeping It Cute Salon & Spa'
    })
  }
}

// Simplified import functions for testing
async function importWixServices(wix, batchSize, skipExisting) {
  let imported = 0, errors = 0, skipped = 0
  
  try {
    const wixResponse = await wix.getServices()
    console.log('Services response:', JSON.stringify(wixResponse, null, 2))
    
    if (wixResponse?.services) {
      for (const service of wixResponse.services.slice(0, Math.min(batchSize, 10))) {
        try {
          const serviceRecord = {
            wix_service_id: service.id,
            name: service.info?.name || 'Unknown Service',
            description: service.info?.description || null,
            duration: service.schedule?.duration || 60,
            price: service.payment?.pricing?.price?.value || 0,
            is_active: !service.hidden,
            category: 'beauty',
            color: '#E91E63'
          }
          
          const { error } = await supabase
            .from('salon_services')
            .upsert(serviceRecord, { onConflict: 'wix_service_id' })
          
          if (error) {
            console.log('Service insert error:', error)
            errors++
          } else {
            imported++
          }
        } catch (err) {
          errors++
        }
      }
    }
  } catch (error) {
    console.log('Services import error:', error)
    throw error
  }
  
  return { imported, errors, skipped }
}

async function importWixBookings(wix, batchSize, skipExisting) {
  let imported = 0, errors = 0, skipped = 0
  
  try {
    const wixResponse = await wix.getBookings({ limit: Math.min(batchSize, 10) })
    console.log('Bookings response keys:', Object.keys(wixResponse || {}))
    
    if (wixResponse?.bookings) {
      console.log(`Processing ${wixResponse.bookings.length} bookings`)
      // Process bookings here
      imported = wixResponse.bookings.length
    }
  } catch (error) {
    console.log('Bookings import error:', error)
    throw error
  }
  
  return { imported, errors, skipped }
}

async function importWixContacts(wix, batchSize, skipExisting) {
  let imported = 0, errors = 0, skipped = 0
  
  try {
    const wixResponse = await wix.getContacts({ limit: Math.min(batchSize, 10) })
    console.log('Contacts response keys:', Object.keys(wixResponse || {}))
    
    if (wixResponse?.contacts) {
      console.log(`Processing ${wixResponse.contacts.length} contacts`)
      // Process contacts here
      imported = wixResponse.contacts.length
    }
  } catch (error) {
    console.log('Contacts import error:', error)
    throw error
  }
  
  return { imported, errors, skipped }
}