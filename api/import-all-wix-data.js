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
    const wix = new WixAPIManager()
    
    const importResults = {
      bookings: { imported: 0, errors: 0, skipped: 0 },
      contacts: { imported: 0, errors: 0, skipped: 0 },
      orders: { imported: 0, errors: 0, skipped: 0 },
      services: { imported: 0, errors: 0, skipped: 0 }
    }

    const entitiesToImport = entities.includes('all') 
      ? ['bookings', 'contacts', 'orders', 'services']
      : entities

    console.log(`🔄 Starting Wix import for Keeping It Cute Salon: ${entitiesToImport.join(', ')}`)

    // Log start of import
    let syncSession = null
    try {
      const { data } = await supabase
        .from('wix_sync_operations')
        .insert({
          operation_type: 'import',
          table_name: 'multiple',
          wix_entity_type: 'bulk_import',
          status: 'running'
        })
        .select()
        .single()
      syncSession = data
    } catch (syncError) {
      console.log('⚠️ Sync operations table not ready yet, continuing without logging')
    }

    // Import each entity type
    for (const entity of entitiesToImport) {
      console.log(`📊 Importing ${entity} from Wix...`)
      
      switch (entity) {
        case 'bookings':
          importResults.bookings = await importWixBookings(wix, batchSize, skipExisting)
          break
        case 'contacts':
          importResults.contacts = await importWixContacts(wix, batchSize, skipExisting)
          break
        case 'orders':
          importResults.orders = await importWixOrders(wix, batchSize, skipExisting)
          break
        case 'services':
          importResults.services = await importWixServices(wix, batchSize, skipExisting)
          break
      }
    }

    // Complete sync session if it was created
    if (syncSession) {
      await supabase
        .from('wix_sync_operations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          records_processed: Object.values(importResults).reduce((sum, r) => sum + r.imported + r.skipped, 0),
          records_successful: Object.values(importResults).reduce((sum, r) => sum + r.imported, 0),
          records_failed: Object.values(importResults).reduce((sum, r) => sum + r.errors, 0),
          results: importResults
        })
        .eq('id', syncSession.id)
    }

    res.status(200).json({
      success: true,
      message: '🎊 Keeping It Cute Salon - Wix data imported successfully!',
      results: importResults,
      session_id: syncSession?.id || null,
      summary: {
        total_imported: Object.values(importResults).reduce((sum, r) => sum + r.imported, 0),
        total_errors: Object.values(importResults).reduce((sum, r) => sum + r.errors, 0),
        total_skipped: Object.values(importResults).reduce((sum, r) => sum + r.skipped, 0)
      }
    })

  } catch (error) {
    console.error('❌ Import failed:', error)
    
    res.status(500).json({
      success: false,
      error: 'Import failed',
      details: error.message,
      salon: 'Keeping It Cute Salon & Spa'
    })
  }
}

// Import Functions
async function importWixBookings(wix, batchSize, skipExisting) {
  let imported = 0, errors = 0, skipped = 0
  
  try {
    console.log('📅 Fetching bookings from Wix...')
    const wixResponse = await wix.getBookings({ limit: batchSize })
    
    if (wixResponse?.bookings) {
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
            console.error(`❌ Booking import error:`, error)
            errors++
          } else {
            console.log(`✅ Imported booking: ${wixBooking.id}`)
            imported++
          }

        } catch (err) {
          console.error(`❌ Processing error:`, err)
          errors++
        }
      }
    } else {
      console.log('ℹ️ No bookings returned from Wix API')
    }
  } catch (error) {
    console.error('❌ Wix bookings fetch failed:', error)
    throw error
  }

  return { imported, errors, skipped }
}

async function importWixContacts(wix, batchSize, skipExisting) {
  let imported = 0, errors = 0, skipped = 0
  
  try {
    console.log('👥 Fetching contacts from Wix...')
    const wixResponse = await wix.getContacts({ limit: batchSize })
    
    if (wixResponse?.contacts) {
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
    } else {
      console.log('ℹ️ No contacts returned from Wix API')
    }
  } catch (error) {
    console.error('❌ Wix contacts fetch failed:', error)
    throw error
  }

  return { imported, errors, skipped }
}

async function importWixOrders(wix, batchSize, skipExisting) {
  let imported = 0, errors = 0, skipped = 0
  
  try {
    console.log('💰 Fetching orders from Wix...')
    const wixResponse = await wix.getOrders({ limit: batchSize })
    
    if (wixResponse?.orders) {
      for (const wixOrder of wixResponse.orders) {
        try {
          if (skipExisting) {
            const { data: existing } = await supabase
              .from('orders')
              .select('id')
              .eq('wix_primary_id', wixOrder.id)
              .maybeSingle()
            
            if (existing) {
              skipped++
              continue
            }
          }

          const orderRecord = {
            wix_primary_id: wixOrder.id,
            wix_order_id: wixOrder.id,
            order_number: wixOrder.number || null,
            customer_email: wixOrder.buyerInfo?.email || null,
            total_amount: wixOrder.priceSummary?.subtotal?.amount || 0,
            currency: wixOrder.priceSummary?.subtotal?.currency || 'USD',
            payment_status: wixOrder.paymentStatus?.toLowerCase() || 'pending',
            fulfillment_status: wixOrder.fulfillmentStatus?.toLowerCase() || 'not_fulfilled',
            order_date: wixOrder.dateCreated || null,
            updated_date: wixOrder.dateUpdated || null,
            wix_sync_status: 'synced',
            last_wix_sync: new Date().toISOString(),
            raw_data: wixOrder
          }
          
          const { error } = await supabase
            .from('orders')
            .upsert(orderRecord, { onConflict: 'wix_primary_id' })
          
          if (error) {
            errors++
          } else {
            imported++
          }

        } catch (err) {
          errors++
        }
      }
    } else {
      console.log('ℹ️ No orders returned from Wix API')
    }
  } catch (error) {
    console.error('❌ Wix orders fetch failed:', error)
    // Don't throw for orders since some sites might not have ecommerce enabled
    console.log('⚠️ Continuing without orders...')
  }

  return { imported, errors, skipped }
}

async function importWixServices(wix, batchSize, skipExisting) {
  let imported = 0, errors = 0, skipped = 0
  
  try {
    console.log('💇‍♀️ Fetching services from Wix...')
    const wixResponse = await wix.getServices()
    
    if (wixResponse?.services) {
      for (const wixService of wixResponse.services) {
        try {
          if (skipExisting) {
            const { data: existing } = await supabase
              .from('salon_services')
              .select('id')
              .eq('wix_service_id', wixService.id)
              .maybeSingle()
            
            if (existing) {
              skipped++
              continue
            }
          }

          const serviceRecord = {
            wix_service_id: wixService.id,
            name: wixService.info?.name || null,
            description: wixService.info?.description || null,
            duration: wixService.schedule?.duration || 60,
            price: wixService.payment?.pricing?.price?.value || 0,
            category: wixService.info?.category || 'beauty',
            is_active: !wixService.hidden,
            color: '#E91E63',
            wix_sync_status: 'synced',
            last_wix_sync: new Date().toISOString(),
            raw_data: wixService
          }
          
          const { error } = await supabase
            .from('salon_services')
            .upsert(serviceRecord, { onConflict: 'wix_service_id' })
          
          if (error) {
            errors++
          } else {
            imported++
          }

        } catch (err) {
          errors++
        }
      }
    } else {
      console.log('ℹ️ No services returned from Wix API')
    }
  } catch (error) {
    console.error('❌ Wix services fetch failed:', error)
    throw error
  }

  return { imported, errors, skipped }
}
