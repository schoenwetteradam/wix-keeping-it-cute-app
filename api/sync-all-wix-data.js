// api/sync-all-wix-data.js - Complete Historical Data Sync
import { createSupabaseClient } from '../utils/supabaseClient'
import { WixAPIManager } from '../utils/wixApiManager'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()
const wix = new WixAPIManager()

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { 
    tables = ['all'], // ['bookings', 'contacts', 'orders', 'products', 'loyalty'] or 'all'
    batchSize = 100,
    skipExisting = true 
  } = req.body

  try {
    const syncResults = {
      bookings: { synced: 0, errors: 0 },
      contacts: { synced: 0, errors: 0 },
      orders: { synced: 0, errors: 0 },
      products: { synced: 0, errors: 0 },
      loyalty: { synced: 0, errors: 0 },
      services: { synced: 0, errors: 0 }
    }

    const tablesToSync = tables.includes('all') 
      ? ['bookings', 'contacts', 'orders', 'products', 'loyalty', 'services']
      : tables

    console.log(`🔄 Starting sync for tables: ${tablesToSync.join(', ')}`)

    // Sync each table
    for (const table of tablesToSync) {
      console.log(`\n📊 Syncing ${table}...`)
      
      switch (table) {
        case 'bookings':
          syncResults.bookings = await syncBookings(batchSize, skipExisting)
          break
        case 'contacts':
          syncResults.contacts = await syncContacts(batchSize, skipExisting)
          break
        case 'orders':
          syncResults.orders = await syncOrders(batchSize, skipExisting)
          break
        case 'products':
          syncResults.products = await syncProducts(batchSize, skipExisting)
          break
        case 'loyalty':
          syncResults.loyalty = await syncLoyalty(batchSize, skipExisting)
          break
        case 'services':
          syncResults.services = await syncServices(batchSize, skipExisting)
          break
        default:
          console.log(`⚠️ Unknown table: ${table}`)
      }
    }

    // Log sync completion
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'bulk_sync_completed',
        webhook_status: 'success',
        data: {
          sync_results: syncResults,
          tables_synced: tablesToSync,
          timestamp: new Date().toISOString()
        }
      })

    res.status(200).json({
      success: true,
      message: 'Sync completed successfully',
      results: syncResults,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Sync failed:', error)
    
    // Log sync failure
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'bulk_sync_failed',
        webhook_status: 'failed',
        error_message: error.message,
        data: {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      })

    res.status(500).json({
      success: false,
      error: 'Sync failed',
      details: error.message
    })
  }
}

// === BOOKING SYNC ===
async function syncBookings(batchSize, skipExisting) {
  let synced = 0, errors = 0, cursor = null
  
  try {
    do {
      console.log(`📅 Fetching bookings batch (cursor: ${cursor})...`)
      
      // Fetch bookings from Wix
      const wixBookings = await fetchWixBookings(cursor, batchSize)
      
      if (!wixBookings?.bookings?.length) {
        console.log('No more bookings to sync')
        break
      }

      // Process each booking
      for (const wixBooking of wixBookings.bookings) {
        try {
          // Skip if already exists and skipExisting is true
          if (skipExisting) {
            const { data: existing } = await supabase
              .from('bookings')
              .select('id')
              .eq('wix_booking_id', wixBooking.id)
              .maybeSingle()
            
            if (existing) {
              console.log(`⏭️ Skipping existing booking: ${wixBooking.id}`)
              continue
            }
          }

          // Transform Wix booking to Supabase format
          const bookingRecord = await transformWixBooking(wixBooking)
          
          // Insert/upsert into Supabase
          const { error } = await supabase
            .from('bookings')
            .upsert(bookingRecord, { onConflict: 'wix_booking_id' })
          
          if (error) {
            console.error(`❌ Failed to sync booking ${wixBooking.id}:`, error)
            errors++
          } else {
            console.log(`✅ Synced booking: ${wixBooking.id}`)
            synced++
          }

        } catch (err) {
          console.error(`❌ Error processing booking ${wixBooking.id}:`, err)
          errors++
        }
      }

      cursor = wixBookings.metadata?.cursor
      console.log(`📊 Bookings batch complete. Synced: ${synced}, Errors: ${errors}`)
      
    } while (cursor)
    
  } catch (err) {
    console.error('❌ Booking sync failed:', err)
    errors++
  }

  return { synced, errors }
}

// === CONTACT SYNC ===
async function syncContacts(batchSize, skipExisting) {
  let synced = 0, errors = 0, cursor = null
  
  try {
    do {
      console.log(`👥 Fetching contacts batch (cursor: ${cursor})...`)
      
      const wixContacts = await fetchWixContacts(cursor, batchSize)
      
      if (!wixContacts?.contacts?.length) {
        console.log('No more contacts to sync')
        break
      }

      for (const wixContact of wixContacts.contacts) {
        try {
          if (skipExisting) {
            const { data: existing } = await supabase
              .from('contacts')
              .select('id')
              .eq('wix_contact_id', wixContact.id)
              .maybeSingle()
            
            if (existing) {
              console.log(`⏭️ Skipping existing contact: ${wixContact.id}`)
              continue
            }
          }

          const contactRecord = transformWixContact(wixContact)
          
          const { error } = await supabase
            .from('contacts')
            .upsert(contactRecord, { onConflict: 'wix_contact_id' })
          
          if (error) {
            console.error(`❌ Failed to sync contact ${wixContact.id}:`, error)
            errors++
          } else {
            console.log(`✅ Synced contact: ${wixContact.id}`)
            synced++
          }

        } catch (err) {
          console.error(`❌ Error processing contact ${wixContact.id}:`, err)
          errors++
        }
      }

      cursor = wixContacts.metadata?.cursor
      console.log(`📊 Contacts batch complete. Synced: ${synced}, Errors: ${errors}`)
      
    } while (cursor)
    
  } catch (err) {
    console.error('❌ Contact sync failed:', err)
    errors++
  }

  return { synced, errors }
}

// === ORDER SYNC ===
async function syncOrders(batchSize, skipExisting) {
  let synced = 0, errors = 0, cursor = null
  
  try {
    do {
      console.log(`💰 Fetching orders batch (cursor: ${cursor})...`)
      
      const wixOrders = await fetchWixOrders(cursor, batchSize)
      
      if (!wixOrders?.orders?.length) {
        console.log('No more orders to sync')
        break
      }

      for (const wixOrder of wixOrders.orders) {
        try {
          if (skipExisting) {
            const { data: existing } = await supabase
              .from('orders')
              .select('id')
              .eq('wix_order_id', wixOrder.id)
              .maybeSingle()
            
              if (existing) {
                console.log(`⏭️ Skipping existing order: ${wixOrder.id}`)
                continue
              }
          }

          const orderRecord = await transformWixOrder(wixOrder)
          
          const { error } = await supabase
            .from('orders')
            .upsert(orderRecord, { onConflict: 'wix_order_id' })
          
          if (error) {
            console.error(`❌ Failed to sync order ${wixOrder.id}:`, error)
            errors++
          } else {
            console.log(`✅ Synced order: ${wixOrder.id}`)
            synced++
          }

        } catch (err) {
          console.error(`❌ Error processing order ${wixOrder.id}:`, err)
          errors++
        }
      }

      cursor = wixOrders.metadata?.cursor
      console.log(`📊 Orders batch complete. Synced: ${synced}, Errors: ${errors}`)
      
    } while (cursor)
    
  } catch (err) {
    console.error('❌ Order sync failed:', err)
    errors++
  }

  return { synced, errors }
}

// === PRODUCT SYNC ===
async function syncProducts(batchSize, skipExisting) {
  let synced = 0, errors = 0, cursor = null
  
  try {
    do {
      console.log(`📦 Fetching products batch (cursor: ${cursor})...`)
      
      const wixProducts = await fetchWixProducts(cursor, batchSize)
      
      if (!wixProducts?.products?.length) {
        console.log('No more products to sync')
        break
      }

      for (const wixProduct of wixProducts.products) {
        try {
          if (skipExisting) {
            const { data: existing } = await supabase
              .from('products')
              .select('id')
              .eq('wix_product_id', wixProduct.id)
              .maybeSingle()
            
            if (existing) {
              console.log(`⏭️ Skipping existing product: ${wixProduct.id}`)
              continue
            }
          }

          const productRecord = transformWixProduct(wixProduct)
          
          const { error } = await supabase
            .from('products')
            .upsert(productRecord, { onConflict: 'wix_product_id' })
          
          if (error) {
            console.error(`❌ Failed to sync product ${wixProduct.id}:`, error)
            errors++
          } else {
            console.log(`✅ Synced product: ${wixProduct.id}`)
            synced++
          }

        } catch (err) {
          console.error(`❌ Error processing product ${wixProduct.id}:`, err)
          errors++
        }
      }

      cursor = wixProducts.metadata?.cursor
      console.log(`📊 Products batch complete. Synced: ${synced}, Errors: ${errors}`)
      
    } while (cursor)
    
  } catch (err) {
    console.error('❌ Product sync failed:', err)
    errors++
  }

  return { synced, errors }
}

// === LOYALTY SYNC ===
async function syncLoyalty(batchSize, skipExisting) {
  let synced = 0, errors = 0
  
  try {
    console.log(`🎁 Fetching loyalty accounts...`)
    
    // Get all contacts first, then fetch their loyalty data
    const { data: contacts } = await supabase
      .from('contacts')
      .select('wix_contact_id, email')
      .not('wix_contact_id', 'is', null)
    
    if (!contacts?.length) {
      console.log('No contacts found for loyalty sync')
      return { synced, errors }
    }

    for (const contact of contacts) {
      try {
        if (!contact.wix_contact_id) continue
        
        // Fetch loyalty data for this contact
        const loyaltyData = await fetchWixLoyaltyAccount(contact.wix_contact_id)
        
        if (!loyaltyData) continue

        if (skipExisting) {
          const { data: existing } = await supabase
            .from('loyalty')
            .select('id')
            .eq('wix_contact_id', contact.wix_contact_id)
            .maybeSingle()
          
          if (existing) {
            console.log(`⏭️ Skipping existing loyalty: ${contact.wix_contact_id}`)
            continue
          }
        }

        const loyaltyRecord = transformWixLoyalty(loyaltyData, contact)
        
        const { error } = await supabase
          .from('loyalty')
          .upsert(loyaltyRecord, { onConflict: 'wix_contact_id' })
        
        if (error) {
          console.error(`❌ Failed to sync loyalty for ${contact.wix_contact_id}:`, error)
          errors++
        } else {
          console.log(`✅ Synced loyalty: ${contact.wix_contact_id}`)
          synced++
        }

      } catch (err) {
        console.error(`❌ Error processing loyalty for ${contact.wix_contact_id}:`, err)
        errors++
      }
    }
    
  } catch (err) {
    console.error('❌ Loyalty sync failed:', err)
    errors++
  }

  return { synced, errors }
}

// === SERVICE SYNC ===
async function syncServices(batchSize, skipExisting) {
  let synced = 0, errors = 0
  
  try {
    console.log(`🎨 Fetching services...`)
    
    const wixServices = await wix.getServices()
    
    if (!wixServices?.services?.length) {
      console.log('No services found to sync')
      return { synced, errors }
    }

    for (const wixService of wixServices.services) {
      try {
        if (skipExisting) {
          const { data: existing } = await supabase
            .from('salon_services')
            .select('id')
            .eq('wix_service_id', wixService.id)
            .maybeSingle()
          
          if (existing) {
            console.log(`⏭️ Skipping existing service: ${wixService.id}`)
            continue
          }
        }

        const serviceRecord = transformWixService(wixService)
        
        const { error } = await supabase
          .from('salon_services')
          .upsert(serviceRecord, { onConflict: 'wix_service_id' })
        
        if (error) {
          console.error(`❌ Failed to sync service ${wixService.id}:`, error)
          errors++
        } else {
          console.log(`✅ Synced service: ${wixService.id}`)
          synced++
        }

      } catch (err) {
        console.error(`❌ Error processing service ${wixService.id}:`, err)
        errors++
      }
    }
    
  } catch (err) {
    console.error('❌ Service sync failed:', err)
    errors++
  }

  return { synced, errors }
}

// === WIX API FETCH FUNCTIONS ===

async function fetchWixBookings(cursor = null, limit = 100) {
  const query = {
    sort: [{ fieldName: 'created_date', order: 'ASC' }],
    paging: { limit }
  }
  
  if (cursor) {
    query.paging.cursor = cursor
  }

  return wix.makeRequest('/bookings/v2/bookings/query', 'POST', { query })
}

async function fetchWixContacts(cursor = null, limit = 100) {
  const query = {
    sort: [{ fieldName: 'created_date', order: 'ASC' }],
    paging: { limit }
  }
  
  if (cursor) {
    query.paging.cursor = cursor
  }

  return wix.makeRequest('/contacts/v4/contacts/query', 'POST', { query })
}

async function fetchWixOrders(cursor = null, limit = 100) {
  const query = {
    sort: [{ fieldName: 'created_date', order: 'ASC' }],
    paging: { limit }
  }
  
  if (cursor) {
    query.paging.cursor = cursor
  }

  return wix.makeRequest('/ecom/v1/orders/query', 'POST', { query })
}

async function fetchWixProducts(cursor = null, limit = 100) {
  const query = {
    sort: [{ fieldName: 'created_date', order: 'ASC' }],
    paging: { limit }
  }
  
  if (cursor) {
    query.paging.cursor = cursor
  }

  return wix.makeRequest('/stores/v1/products/query', 'POST', { query })
}

async function fetchWixLoyaltyAccount(contactId) {
  try {
    return await wix.makeRequest(`/loyalty/v2/accounts/${contactId}`)
  } catch (err) {
    if (err.message.includes('404')) {
      return null // No loyalty account for this contact
    }
    throw err
  }
}

// === TRANSFORMATION FUNCTIONS ===

async function transformWixBooking(wixBooking) {
  const record = {
    wix_booking_id: wixBooking.id,
    customer_email: wixBooking.contactDetails?.email,
    customer_name: `${wixBooking.contactDetails?.firstName || ''} ${wixBooking.contactDetails?.lastName || ''}`.trim(),
    customer_phone: wixBooking.contactDetails?.phone,
    wix_contact_id: wixBooking.contactDetails?.contactId,
    service_name: wixBooking.bookedEntity?.name || wixBooking.serviceId,
    wix_service_id: wixBooking.serviceId,
    service_duration: wixBooking.bookedEntity?.scheduleItem?.duration,
    appointment_date: wixBooking.startDate,
    end_time: wixBooking.endDate,
    status: wixBooking.status?.toLowerCase(),
    payment_status: wixBooking.paymentStatus?.toLowerCase(),
    total_price: wixBooking.totalPrice?.amount,
    location: wixBooking.location?.address,
    number_of_participants: wixBooking.participantCount || 1,
    notes: wixBooking.additionalInfo,
    wix_staff_resource_id: wixBooking.bookedEntity?.staffResourceId,
    payload: wixBooking,
    raw_data: wixBooking,
    created_at: wixBooking.createdDate || new Date().toISOString(),
    created_date: wixBooking.createdDate || new Date().toISOString(),
    updated_at: wixBooking.updatedDate || new Date().toISOString(),
    updated_date: wixBooking.updatedDate || new Date().toISOString(),
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
    revision: 1
  }

  // Link to existing records
  await linkBookingRelationships(record)
  
  return record
}

function transformWixContact(wixContact) {
  return {
    wix_contact_id: wixContact.id,
    email: wixContact.info?.emails?.items?.[0]?.email,
    phone: wixContact.info?.phones?.items?.[0]?.phone,
    first_name: wixContact.info?.name?.first,
    last_name: wixContact.info?.name?.last,
    address: wixContact.info?.addresses?.items?.[0]?.address,
    birth_date: wixContact.info?.birthdate,
    labels: wixContact.info?.labelKeys,
    raw_data: wixContact,
    created_at: wixContact.createdDate || new Date().toISOString(),
    updated_at: wixContact.updatedDate || new Date().toISOString(),
    sync_status: 'synced',
    last_synced_at: new Date().toISOString()
  }
}

async function transformWixOrder(wixOrder) {
  const record = {
    wix_order_id: wixOrder.id,
    order_number: wixOrder.number,
    total_amount: wixOrder.totals?.total,
    payment_status: wixOrder.paymentStatus?.toLowerCase(),
    fulfillment_status: wixOrder.fulfillmentStatus?.toLowerCase(),
    customer_email: wixOrder.buyerInfo?.email,
    customer_name: `${wixOrder.buyerInfo?.firstName || ''} ${wixOrder.buyerInfo?.lastName || ''}`.trim(),
    wix_contact_id: wixOrder.buyerInfo?.contactId,
    currency: wixOrder.currency,
    channel_info: wixOrder.channelInfo,
    raw_data: wixOrder,
    created_at: wixOrder.createdDate || new Date().toISOString(),
    updated_at: wixOrder.updatedDate || new Date().toISOString(),
    sync_status: 'synced',
    last_synced_at: new Date().toISOString()
  }

  // Link to customer
  if (record.wix_contact_id || record.customer_email) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .or(`wix_contact_id.eq.${record.wix_contact_id},email.eq.${record.customer_email}`)
      .maybeSingle()
    
    if (contact) {
      record.customer_id = contact.id
    }
  }

  return record
}

function transformWixProduct(wixProduct) {
  const variants = wixProduct.productOptions?.options || []
  const inventory = wixProduct.manageQuantity ? wixProduct.quantity : null
  
  return {
    wix_product_id: wixProduct.id,
    product_name: wixProduct.name,
    description: wixProduct.description,
    sku: wixProduct.sku,
    price: wixProduct.price?.price,
    selling_price: wixProduct.price?.price,
    cost_per_unit: wixProduct.costAndProfitData?.itemCost,
    current_stock: inventory,
    in_stock: inventory > 0 ? 'In Stock' : 'Out of Stock',
    is_active: wixProduct.visible,
    category: wixProduct.productType,
    brand: wixProduct.brand,
    image_url: wixProduct.media?.mainMedia?.image?.url,
    barcode: wixProduct.additionalInfoSections?.find(s => s.title === 'Barcode')?.description,
    raw_data: wixProduct,
    created_at: wixProduct.createdDate || new Date().toISOString(),
    updated_at: wixProduct.lastUpdated || new Date().toISOString(),
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
    sync_to_wix: true
  }
}

function transformWixService(wixService) {
  return {
    wix_service_id: wixService.id,
    name: wixService.name,
    description: wixService.description,
    duration_minutes: wixService.scheduleItem?.duration,
    price: wixService.payment?.price?.amount,
    category: wixService.category,
    image_url: wixService.media?.mainMedia?.image?.url,
    is_active: wixService.status === 'ACTIVE',
    created_at: wixService.createdDate || new Date().toISOString(),
    updated_at: wixService.updatedDate || new Date().toISOString()
  }
}

function transformWixLoyalty(loyaltyData, contact) {
  return {
    wix_contact_id: contact.wix_contact_id,
    email: contact.email,
    points_balance: loyaltyData.balance || 0,
    tier: loyaltyData.tier,
    status: loyaltyData.status?.toLowerCase(),
    raw_data: loyaltyData,
    created_at: loyaltyData.dateCreated || new Date().toISOString(),
    updated_at: loyaltyData.dateUpdated || new Date().toISOString(),
    sync_status: 'synced',
    last_synced_at: new Date().toISOString()
  }
}

// === RELATIONSHIP LINKING ===

async function linkBookingRelationships(record) {
  // Link to customer
  if (record.wix_contact_id || record.customer_email) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .or(
        [
          record.wix_contact_id ? `wix_contact_id.eq.${record.wix_contact_id}` : null,
          record.customer_email ? `email.eq.${record.customer_email}` : null
        ].filter(Boolean).join(',')
      )
      .maybeSingle()
    
    if (contact) {
      record.customer_id = contact.id
    }
  }

  // Link to service
  if (record.wix_service_id || record.service_name) {
    const { data: service } = await supabase
      .from('salon_services')
      .select('id, duration_minutes, price')
      .or(
        [
          record.wix_service_id ? `wix_service_id.eq.${record.wix_service_id}` : null,
          record.service_name ? `name.ilike.%${record.service_name}%` : null
        ].filter(Boolean).join(',')
      )
      .maybeSingle()
    
    if (service) {
      record.service_id = service.id
      if (!record.service_duration) record.service_duration = service.duration_minutes
      if (!record.total_price) record.total_price = service.price
    }
  }

  // Link to staff
  if (record.wix_staff_resource_id) {
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('wix_staff_resource_id', record.wix_staff_resource_id)
      .maybeSingle()
    
    if (staff) {
      record.staff_id = staff.id
    }
  }

  // Calculate end_time if missing
  if (!record.end_time && record.appointment_date && record.service_duration) {
    const startTime = new Date(record.appointment_date)
    const endTime = new Date(startTime.getTime() + (record.service_duration * 60000))
    record.end_time = endTime.toISOString()
  }
}

// === UTILITY FUNCTIONS ===

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function validateSyncResults(results) {
  console.log('\n📊 SYNC SUMMARY:')
  console.log('================')
  
  for (const [table, result] of Object.entries(results)) {
    const total = result.synced + result.errors
    const successRate = total > 0 ? ((result.synced / total) * 100).toFixed(1) : '0'
    console.log(`${table.toUpperCase()}: ${result.synced} synced, ${result.errors} errors (${successRate}% success)`)
  }
  
  // Check for orphaned records
  const orphanCheck = await checkOrphanedRecords()
  if (orphanCheck.hasOrphans) {
    console.log('\n⚠️ ORPHANED RECORDS DETECTED:')
    console.log(orphanCheck.details)
  }
  
  return results
}

async function checkOrphanedRecords() {
  try {
    const { data: orphanedBookings } = await supabase
      .from('bookings')
      .select('id, wix_booking_id, customer_email, service_name')
      .is('customer_id', null)
      .limit(10)

    const { data: orphanedOrders } = await supabase
      .from('orders')
      .select('id, wix_order_id, customer_email')
      .is('customer_id', null)
      .limit(10)

    return {
      hasOrphans: (orphanedBookings?.length > 0) || (orphanedOrders?.length > 0),
      details: {
        orphaned_bookings: orphanedBookings?.length || 0,
        orphaned_orders: orphanedOrders?.length || 0,
        examples: {
          bookings: orphanedBookings || [],
          orders: orphanedOrders || []
        }
      }
    }
  } catch (err) {
    console.error('❌ Orphan check failed:', err)
    return { hasOrphans: false, details: {} }
  }
}

