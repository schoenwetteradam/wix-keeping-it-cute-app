// Complete Wix Booking Import System
// /api/bulk-import-wix-bookings.js

import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { 
    source = 'csv', // 'csv' or 'wix_api'
    batchSize = 50,
    skipExisting = true,
    csvData = null
  } = req.body;

  console.log('🚀 Starting bulk Wix booking import...');

  try {
    let bookings = [];
    
    if (source === 'csv' && csvData) {
      // Import from CSV data
      bookings = await processCSVBookings(csvData);
    } else if (source === 'wix_api') {
      // Import directly from Wix API
      bookings = await fetchAllWixBookings();
    } else {
      return res.status(400).json({
        error: 'Invalid source or missing CSV data'
      });
    }

    console.log(`📊 Found ${bookings.length} bookings to import`);

    // Process bookings in batches
    const results = await processBatchImport(bookings, batchSize, skipExisting);

    // Generate comprehensive report
    const report = await generateImportReport(results);

    res.status(200).json({
      success: true,
      message: 'Bulk import completed',
      results,
      report,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Bulk import failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Bulk import failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Process CSV booking data
async function processCSVBookings(csvData) {
  console.log('📋 Processing CSV booking data...');
  
  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });

  if (parsed.errors.length > 0) {
    console.warn('⚠️ CSV parsing warnings:', parsed.errors);
  }

  return parsed.data.map((row, index) => transformCSVRowToBooking(row, index));
}

// Transform CSV row to booking format
function transformCSVRowToBooking(row, index) {
  // Parse dates safely
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  };

  // Parse price safely
  const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    const cleaned = String(priceStr).replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Parse duration to minutes
  const parseDuration = (durationStr) => {
    if (!durationStr) return 60; // default
    const str = String(durationStr).toLowerCase();
    if (str.includes('hour')) {
      const hours = parseFloat(str.match(/(\d+\.?\d*)\s*hour/)?[1] || 1);
      return Math.round(hours * 60);
    }
    if (str.includes('min')) {
      return parseInt(str.match(/(\d+)\s*min/)?[1] || 60);
    }
    return 60; // default
  };

  // Extract form responses into structured data
  const formData = {};
  for (let i = 0; i <= 39; i++) {
    const field = row[`Form Field ${i}`];
    const response = row[`Form Response ${i}`];
    if (field && response) {
      formData[field] = response;
    }
  }

  return {
    // Generate a unique ID for this booking
    import_id: `csv_import_${index + 1}_${Date.now()}`,
    
    // Customer information
    customer_email: row['Email']?.trim().toLowerCase() || null,
    customer_name: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim() || 'Unknown Customer',
    customer_phone: row['Phone']?.trim() || null,
    
    // Service information
    service_name: row['Service Name']?.trim() || 'Unknown Service',
    service_duration: parseDuration(row['Duration']),
    
    // Booking timing
    appointment_date: parseDate(row['Booking Start Time']),
    end_time: parseDate(row['Booking End Time']),
    
    // Staff and location
    staff_member: row['Staff Member']?.trim() || null,
    location: row['Location Address']?.trim() || 'Keeping It Cute Salon & Spa',
    
    // Booking details
    status: (row['Booking Status']?.toLowerCase() || 'confirmed').replace(/\s+/g, '_'),
    payment_status: (row['Payment Status']?.toLowerCase() || 'pending').replace(/\s+/g, '_'),
    total_price: parsePrice(row['Order Total']),
    
    // Additional details
    number_of_participants: parseInt(row['Group Size']) || 1,
    notes: [
      row['Price Option '] ? `Price Option: ${row['Price Option ']}` : null,
      row['Coupon Name'] ? `Coupon: ${row['Coupon Name']}` : null,
      row['Attendance'] ? `Attendance: ${row['Attendance']}` : null,
      Object.keys(formData).length > 0 ? `Form Data: ${JSON.stringify(formData, null, 2)}` : null
    ].filter(Boolean).join('\n') || null,
    
    // Order information
    wix_order_id: row['Order Number'] ? String(row['Order Number']) : null,
    
    // System fields
    business_id: process.env.WIX_SITE_ID,
    sync_status: 'csv_imported',
    created_at: parseDate(row['Registration Date']) || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    
    // Store raw CSV data for reference
    raw_data: {
      csv_source: true,
      import_batch: new Date().toISOString(),
      original_row: row,
      form_responses: formData
    }
  };
}

// Fetch all bookings from Wix API
async function fetchAllWixBookings() {
  console.log('🔗 Fetching bookings from Wix API...');
  
  const allBookings = [];
  let cursor = null;
  let pageCount = 0;
  
  do {
    try {
      console.log(`📄 Fetching page ${pageCount + 1}...`);
      
      const response = await fetch('https://www.wixapis.com/bookings/v2/bookings/query', {
        method: 'POST',
        headers: {
          'Authorization': process.env.WIX_API_TOKEN,
          'wix-site-id': process.env.WIX_SITE_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: {
            sort: [{ fieldName: 'created_date', order: 'ASC' }],
            paging: { 
              limit: 100,
              ...(cursor && { cursor })
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Wix API error: ${response.status} - ${await response.text()}`);
      }

      const data = await response.json();
      
      if (data.bookings && data.bookings.length > 0) {
        allBookings.push(...data.bookings.map(transformWixBooking));
        console.log(`✅ Fetched ${data.bookings.length} bookings (total: ${allBookings.length})`);
      }
      
      cursor = data.metadata?.cursor;
      pageCount++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error fetching page ${pageCount + 1}:`, error);
      throw error;
    }
  } while (cursor && pageCount < 50); // Safety limit
  
  console.log(`🎉 Fetched ${allBookings.length} total bookings from Wix`);
  return allBookings;
}

// Transform Wix API booking to our format
function transformWixBooking(wixBooking) {
  const contactDetails = wixBooking.contactDetails || {};
  const bookedEntity = wixBooking.bookedEntity || {};
  
  return {
    wix_booking_id: wixBooking.id,
    
    // Customer information
    customer_email: contactDetails.email?.toLowerCase() || null,
    customer_name: `${contactDetails.firstName || ''} ${contactDetails.lastName || ''}`.trim() || 'Unknown Customer',
    customer_phone: contactDetails.phone || null,
    wix_contact_id: contactDetails.contactId || contactDetails.id,
    
    // Service information
    service_name: bookedEntity.title || bookedEntity.name || 'Unknown Service',
    service_duration: Math.round((new Date(wixBooking.endDate) - new Date(wixBooking.startDate)) / (1000 * 60)) || 60,
    wix_service_id: bookedEntity.serviceId || bookedEntity.id,
    
    // Booking timing
    appointment_date: wixBooking.startDate,
    end_time: wixBooking.endDate,
    
    // Staff and location
    staff_member: wixBooking.resource?.name || null,
    wix_staff_resource_id: wixBooking.resource?.id,
    location: wixBooking.location?.name || 'Keeping It Cute Salon & Spa',
    
    // Booking details
    status: (wixBooking.status || 'CONFIRMED').toLowerCase(),
    payment_status: (wixBooking.paymentStatus || 'UNDEFINED').toLowerCase(),
    number_of_participants: wixBooking.numberOfParticipants || wixBooking.totalParticipants || 1,
    notes: wixBooking.additionalInformation || wixBooking.notes,
    
    // System fields
    business_id: wixBooking.businessId || process.env.WIX_SITE_ID,
    revision: parseInt(wixBooking.revision) || 1,
    sync_status: 'wix_imported',
    created_at: wixBooking.createdDate || new Date().toISOString(),
    updated_at: wixBooking.updatedDate || new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    
    // Store raw Wix data
    raw_data: {
      wix_source: true,
      import_batch: new Date().toISOString(),
      original_booking: wixBooking
    }
  };
}

// Process bookings in batches
async function processBatchImport(bookings, batchSize, skipExisting) {
  console.log(`🔄 Processing ${bookings.length} bookings in batches of ${batchSize}...`);
  
  const results = {
    total_processed: 0,
    successful_imports: 0,
    skipped_existing: 0,
    failed_imports: 0,
    customers_created: 0,
    services_linked: 0,
    staff_linked: 0,
    errors: []
  };

  for (let i = 0; i < bookings.length; i += batchSize) {
    const batch = bookings.slice(i, i + batchSize);
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} bookings)...`);
    
    try {
      const batchResults = await processSingleBatch(batch, skipExisting);
      
      // Aggregate results
      results.total_processed += batchResults.processed;
      results.successful_imports += batchResults.successful;
      results.skipped_existing += batchResults.skipped;
      results.failed_imports += batchResults.failed;
      results.customers_created += batchResults.customers_created;
      results.services_linked += batchResults.services_linked;
      results.staff_linked += batchResults.staff_linked;
      results.errors.push(...batchResults.errors);
      
      console.log(`✅ Batch complete: ${batchResults.successful} success, ${batchResults.failed} failed, ${batchResults.skipped} skipped`);
      
      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Batch failed:`, error);
      results.errors.push({
        batch: Math.floor(i / batchSize) + 1,
        error: error.message
      });
    }
  }

  return results;
}

// Process a single batch of bookings
async function processSingleBatch(bookings, skipExisting) {
  const results = {
    processed: bookings.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    customers_created: 0,
    services_linked: 0,
    staff_linked: 0,
    errors: []
  };

  for (const booking of bookings) {
    try {
      // Check if booking already exists
      if (skipExisting) {
        const existing = await checkExistingBooking(booking);
        if (existing) {
          results.skipped++;
          continue;
        }
      }

      // Link to existing customer or create new one
      const customerId = await linkOrCreateCustomer(booking);
      if (customerId) {
        booking.customer_id = customerId;
        if (customerId.startsWith('created_')) {
          results.customers_created++;
        }
      }

      // Link to existing service
      const serviceId = await linkToService(booking);
      if (serviceId) {
        booking.service_id = serviceId;
        results.services_linked++;
      }

      // Link to existing staff member
      const staffId = await linkToStaff(booking);
      if (staffId) {
        booking.staff_id = staffId;
        results.staff_linked++;
      }

      // Insert the booking
      const { error } = await supabase
        .from('bookings')
        .insert(booking);

      if (error) {
        throw error;
      }

      results.successful++;

    } catch (error) {
      console.error(`❌ Failed to import booking:`, error);
      results.failed++;
      results.errors.push({
        booking_data: booking,
        error: error.message
      });
    }
  }

  return results;
}

// Check if booking already exists
async function checkExistingBooking(booking) {
  if (booking.wix_booking_id) {
    const { data } = await supabase
      .from('bookings')
      .select('id')
      .eq('wix_booking_id', booking.wix_booking_id)
      .single();
    return !!data;
  }

  if (booking.import_id) {
    const { data } = await supabase
      .from('bookings')
      .select('id')
      .eq('raw_data->>import_id', booking.import_id)
      .single();
    return !!data;
  }

  // Check for duplicates by customer + service + date
  if (booking.customer_email && booking.appointment_date) {
    const { data } = await supabase
      .from('bookings')
      .select('id')
      .eq('customer_email', booking.customer_email)
      .eq('appointment_date', booking.appointment_date)
      .eq('service_name', booking.service_name)
      .single();
    return !!data;
  }

  return false;
}

// Link to existing customer or create new one
async function linkOrCreateCustomer(booking) {
  if (!booking.customer_email) return null;

  // Try to find existing customer
  const { data: existingCustomer } = await supabase
    .from('contacts')
    .select('id')
    .eq('email', booking.customer_email)
    .single();

  if (existingCustomer) {
    return existingCustomer.id;
  }

  // Create new customer
  const { data: newCustomer, error } = await supabase
    .from('contacts')
    .insert({
      email: booking.customer_email,
      first_name: booking.customer_name.split(' ')[0] || 'Customer',
      last_name: booking.customer_name.split(' ').slice(1).join(' ') || 'Unknown',
      phone: booking.customer_phone,
      sync_status: 'created_from_bulk_import',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create customer:', error);
    return null;
  }

  return `created_${newCustomer.id}`;
}

// Link to existing service
async function linkToService(booking) {
  if (!booking.service_name) return null;

  const { data: service } = await supabase
    .from('salon_services')
    .select('id, price')
    .or(`name.ilike.%${booking.service_name}%,name.ilike.%${booking.service_name.split(' ')[0]}%`)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (service) {
    // Update booking price from service if not set
    if (!booking.total_price && service.price) {
      booking.total_price = service.price;
    }
    return service.id;
  }

  return null;
}

// Link to existing staff member
async function linkToStaff(booking) {
  if (!booking.staff_member) return null;

  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .or(`
      first_name.ilike.%${booking.staff_member}%,
      last_name.ilike.%${booking.staff_member}%,
      email.ilike.%${booking.staff_member}%
    `)
    .eq('is_active', true)
    .limit(1)
    .single();

  return staff?.id || null;
}

// Generate comprehensive import report
async function generateImportReport(results) {
  const { data: totalBookings } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true });

  const { data: importedBookings } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .in('sync_status', ['csv_imported', 'wix_imported']);

  return {
    import_summary: {
      total_processed: results.total_processed,
      successful_imports: results.successful_imports,
      failed_imports: results.failed_imports,
      skipped_existing: results.skipped_existing,
      success_rate: Math.round((results.successful_imports / results.total_processed) * 100)
    },
    relationship_linking: {
      customers_created: results.customers_created,
      services_linked: results.services_linked,
      staff_linked: results.staff_linked
    },
    database_status: {
      total_bookings_in_database: totalBookings.count,
      imported_bookings: importedBookings.count
    },
    error_summary: {
      total_errors: results.errors.length,
      sample_errors: results.errors.slice(0, 5)
    }
  };
}

