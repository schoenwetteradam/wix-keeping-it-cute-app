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
        wix_app_credentials_present:
          !!(process.env.WIX_APP_ID || process.env.WIX_CLIENT_ID) &&
          !!(process.env.WIX_APP_SECRET || process.env.WIX_CLIENT_SECRET) &&
          !!(process.env.WIX_APP_INSTANCE_ID || process.env.WIX_INSTANCE_ID),
        wix_site_id: process.env.WIX_SITE_ID,
        error_stack: error.stack
      },
      salon: 'Keeping It Cute Salon & Spa'
    })
  }
}

// UPDATED SERVICES IMPORT FUNCTION
async function importWixServices(wix, batchSize, skipExisting) {
  let imported = 0, errors = 0, skipped = 0
  
  try {
    const wixResponse = await wix.getServices()
    console.log(`Found ${wixResponse?.services?.length || 0} services from Wix`)
    
    if (wixResponse?.services) {
      for (const service of wixResponse.services.slice(0, Math.min(batchSize, 10))) {
        try {
          // Log the raw service data to understand structure
          console.log('Processing service:', JSON.stringify(service, null, 2))
          
          if (skipExisting) {
            const { data: existing } = await supabase
              .from('salon_services')
              .select('id')
              .eq('wix_service_id', service.id)
              .maybeSingle()
            
            if (existing) {
              skipped++
              continue
            }
          }

          // Extract values with multiple fallback paths
          const serviceName = service.info?.name || 
                             service.name || 
                             service.serviceName || 
                             `Wix Service ${service.id.substring(0, 8)}`

          const serviceDuration = service.schedule?.duration || 
                                service.duration || 
                                service.info?.duration || 
                                60

          const servicePrice = parseFloat(
            service.payment?.pricing?.price?.value || 
            service.price || 
            service.info?.price || 
            0
          )

          const serviceRecord = {
            wix_service_id: service.id,
            name: serviceName, // Required - never null
            description: service.info?.description || service.description || null,
            duration_minutes: parseInt(serviceDuration), // Required - never null, ensure integer
            price: servicePrice, // Required - never null, ensure numeric
            category: service.info?.category || service.category || 'beauty',
            is_active: service.hidden !== true, // Default true unless explicitly hidden
            wix_sync_status: 'synced',
            last_wix_sync: new Date().toISOString()
          }
          
          // Final validation - ensure all required fields are present
          if (!serviceRecord.name || 
              serviceRecord.duration_minutes === null || 
              isNaN(serviceRecord.duration_minutes) ||
              serviceRecord.price === null || 
              isNaN(serviceRecord.price)) {
            
            console.log(`Skipping service ${service.id} - invalid required fields:`, {
              name: serviceRecord.name,
              duration_minutes: serviceRecord.duration_minutes,
              price: serviceRecord.price,
              raw_service_structure: Object.keys(service)
            })
            errors++
            continue
          }
          
          console.log(`Inserting service: ${serviceRecord.name} (${serviceRecord.duration_minutes}min, $${serviceRecord.price})`)
          
          const { error } = await supabase
            .from('salon_services')
            .upsert(serviceRecord, { onConflict: 'wix_service_id' })
          
          if (error) {
            console.log(`Database error for ${serviceRecord.name}:`, error.message)
            errors++
          } else {
            console.log(`Successfully imported: ${serviceRecord.name}`)
            imported++
          }
          
        } catch (err) {
          console.log(`Service processing error:`, err.message)
          errors++
        }
      }
    }
  } catch (error) {
    console.log('Services import failed:', error)
    throw error
  }
  
  return { imported, errors, skipped }
}

// UPDATED BOOKINGS IMPORT FUNCTION
async function importWixBookings(wix, batchSize, skipExisting) {
  let imported = 0, errors = 0, skipped = 0
  
  try {
    const wixResponse = await wix.getBookings({ limit: Math.min(batchSize, 10) })
    console.log('Bookings response keys:', Object.keys(wixResponse || {}))
    
    if (wixResponse?.bookings) {
      console.log(`Processing ${wixResponse.bookings.length} bookings`)
      
      for (const wixBooking of wixResponse.bookings) {
        try {
          if (skipExisting) {
            const { data: existing } = await supabase
              .from('bookings')
              .select('id')
              .eq('wix_primary_id', wixBooking.id)
              .maybeSingle()
            
            if (existing) {
              skipped++
              continue
            }
          }

          const bookingRecord = {
            wix_primary_id: wixBooking.id,
            wix_booking_id: wixBooking.id,
            customer_name: wixBooking.bookedEntity?.contactDetails?.name || null,
            customer_email: wixBooking.bookedEntity?.contactDetails?.email || null,
            customer_phone: wixBooking.bookedEntity?.contactDetails?.phone || null,
            service_name: wixBooking.bookedEntity?.serviceName || null,
            appointment_date: wixBooking.bookedEntity?.schedule?.startDateTime || null,
            end_time: wixBooking.bookedEntity?.schedule?.endDateTime || null,
            status: wixBooking.status?.toLowerCase() || 'pending',
            total_price: wixBooking.payment?.amount || 0,
            payment_status: wixBooking.payment?.status?.toLowerCase() || 'pending',
            notes: wixBooking.additionalFields?.notes || null,
            location: 'Keeping It Cute Salon & Spa',
            wix_sync_status: 'synced',
            last_wix_sync: new Date().toISOString(),
            raw_data: wixBooking
          }
          
          const { error } = await supabase
            .from('bookings')
            .upsert(bookingRecord, { onConflict: 'wix_primary_id' })
          
          if (error) {
            console.error(`Booking import error:`, error)
            errors++
          } else {
            console.log(`Imported booking: ${wixBooking.id}`)
            imported++
          }

        } catch (err) {
          console.error(`Booking processing error:`, err)
          errors++
        }
      }
    }
  } catch (error) {
    console.log('Bookings import error:', error)
    throw error
  }
  
  return { imported, errors, skipped }
}

// UPDATED CONTACTS IMPORT FUNCTION
async function importWixContacts(wix, batchSize, skipExisting) {
  let imported = 0, errors = 0, skipped = 0
  
  try {
    const wixResponse = await wix.getContacts({ limit: Math.min(batchSize, 10) })
    console.log('Contacts response keys:', Object.keys(wixResponse || {}))
    
    if (wixResponse?.contacts) {
      console.log(`Processing ${wixResponse.contacts.length} contacts`)
      
      for (const wixContact of wixResponse.contacts) {
        try {
          if (skipExisting) {
            const { data: existing } = await supabase
              .from('contacts')
              .select('id')
              .eq('wix_primary_id', wixContact.id)
              .maybeSingle()
            
            if (existing) {
              skipped++
              continue
            }
          }

          const contactRecord = {
            wix_primary_id: wixContact.id,
            wix_contact_id: wixContact.id,
            first_name: wixContact.name?.first || null,
            last_name: wixContact.name?.last || null,
            email: wixContact.loginEmail || wixContact.primaryEmail?.email || null,
            phone: wixContact.primaryPhone?.phone || null,
            city: wixContact.addresses?.[0]?.city || null,
            state: wixContact.addresses?.[0]?.subdivision || null,
            source: 'wix',
            wix_sync_status: 'synced',
            last_wix_sync: new Date().toISOString(),
            raw_data: wixContact
          }
          
          const { error } = await supabase
            .from('contacts')
            .upsert(contactRecord, { onConflict: 'wix_primary_id' })
          
          if (error) {
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
    console.log('Contacts import error:', error)
    throw error
  }
  
  return { imported, errors, skipped }
}