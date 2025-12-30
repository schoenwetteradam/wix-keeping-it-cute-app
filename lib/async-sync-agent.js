/**
 * Async Sync Agent
 * Background service for syncing data between Wix and Supabase tables
 * Runs asynchronously without blocking the main request
 */

const { createSupabaseClient } = require('../utils/supabaseClient');

const supabase = createSupabaseClient();

/**
 * Async Sync Agent Class
 * Handles background syncing of Wix data to Supabase mobile app tables
 */
class AsyncSyncAgent {
  constructor(options = {}) {
    this.options = {
      batchSize: options.batchSize || 50,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };
    
    // Initialize Wix API Manager for app-level authentication
    // Note: WixAPIManager uses ES modules, so we'll use dynamic import if needed
    // For now, we'll initialize it lazily when needed
    this.wixApi = null;
    this._wixApiPromise = null;
  }

  /**
   * Initialize Wix API Manager (lazy loading)
   */
  async initWixApi() {
    if (this.wixApi) {
      return this.wixApi;
    }

    if (this._wixApiPromise) {
      return this._wixApiPromise;
    }

    this._wixApiPromise = (async () => {
      try {
        // Try CommonJS require first
        let WixAPIManager;
        try {
          const wixApiModule = require('../utils/wixApiManager');
          WixAPIManager = wixApiModule.WixAPIManager || wixApiModule.default?.WixAPIManager;
        } catch (requireError) {
          // If require fails, try dynamic import (for ES modules)
          const wixApiModule = await import('../utils/wixApiManager.js');
          WixAPIManager = wixApiModule.WixAPIManager || wixApiModule.default;
        }

        if (!WixAPIManager) {
          throw new Error('WixAPIManager class not found');
        }

        this.wixApi = new WixAPIManager();
        return this.wixApi;
      } catch (error) {
        console.error('Failed to initialize Wix API Manager:', error);
        this._wixApiPromise = null;
        throw new Error(`Wix API Manager not available: ${error.message}. Check WIX_SITE_ID and Wix credentials.`);
      }
    })();

    return this._wixApiPromise;
  }

  /**
   * Sync customers/contacts from Wix to Supabase
   */
  async syncCustomers(supabaseUserId = null) {
    const results = {
      synced: 0,
      errors: 0,
      skipped: 0,
      startTime: new Date()
    };

    try {
      const wixApi = await this.initWixApi();

      let cursor = null;
      let hasMore = true;

      while (hasMore) {
        // Fetch contacts from Wix using WixAPIManager
        const wixContacts = await wixApi.getContacts({
          limit: this.options.batchSize,
          cursor: cursor
        });
        
        if (!wixContacts?.contacts?.length) {
          hasMore = false;
          break;
        }

        // Process each contact
        for (const contact of wixContacts.contacts) {
          try {
            const { error } = await supabase
              .from('customers')
              .upsert({
                wix_contact_id: contact.id,
                name: this.formatContactName(contact),
                email: contact.info?.emails?.items?.[0]?.email || contact.email || contact.info?.email,
                phone: contact.info?.phones?.items?.[0]?.phone || contact.phone || contact.info?.phone,
                notes: contact.notes || null,
                updated_at: new Date().toISOString()
              }, { onConflict: 'wix_contact_id' });

            if (error) {
              console.error(`Failed to sync customer ${contact.id}:`, error);
              results.errors++;
            } else {
              results.synced++;
            }
          } catch (err) {
            console.error(`Error syncing customer ${contact.id}:`, err);
            results.errors++;
          }
        }

        // Get next cursor
        cursor = wixContacts.metadata?.cursor || wixContacts.paging?.cursor || wixContacts.cursor;
        hasMore = !!cursor && wixContacts.contacts.length >= this.options.batchSize;
      }

      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;
      
      return results;
    } catch (error) {
      console.error('Customer sync failed:', error);
      results.error = error.message;
      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;
      return results;
    }
  }

  /**
   * Sync appointments/bookings from Wix to Supabase
   */
  async syncAppointments(supabaseUserId = null, dateRange = null) {
    const results = {
      synced: 0,
      errors: 0,
      skipped: 0,
      startTime: new Date()
    };

    try {
      const wixApi = await this.initWixApi();

      let cursor = null;
      let hasMore = true;

      while (hasMore) {
        const params = {
          limit: this.options.batchSize,
          cursor: cursor
        };

        // Add date filter if provided
        if (dateRange?.start) {
          params.startDate = dateRange.start;
          if (dateRange.end) {
            params.endDate = dateRange.end;
          }
        }

        const wixBookings = await wixApi.getBookings(params);
        
        if (!wixBookings?.bookings?.length) {
          hasMore = false;
          break;
        }

        for (const booking of wixBookings.bookings) {
          try {
            // First, ensure customer exists
            const contactId = booking.contactId || booking.contact?.id;
            let customerId = null;

            if (contactId) {
              const { data: customer } = await supabase
                .from('customers')
                .select('id')
                .eq('wix_contact_id', contactId)
                .maybeSingle();

              if (!customer) {
                // Customer doesn't exist - we'll sync customers separately
                // For now, continue without customer_id
              } else {
                customerId = customer.id;
              }
            }

            // Upsert appointment
            const { error } = await supabase
              .from('appointments')
              .upsert({
                wix_booking_id: booking.id,
                customer_id: customerId,
                service_name: booking.service?.name || booking.serviceName || 'Unknown',
                staff_member: booking.staffMember?.name || booking.staffMemberName,
                start_time: booking.startDate || booking.startTime,
                end_time: booking.endDate || booking.endTime,
                status: booking.status || 'pending',
                notes: booking.notes || booking.internalNotes || null
              }, { onConflict: 'wix_booking_id' });

            if (error) {
              console.error(`Failed to sync appointment ${booking.id}:`, error);
              results.errors++;
            } else {
              results.synced++;
            }
          } catch (err) {
            console.error(`Error syncing appointment ${booking.id}:`, err);
            results.errors++;
          }
        }

        // Get next cursor
        cursor = wixBookings.metadata?.cursor || wixBookings.paging?.cursor || wixBookings.cursor;
        hasMore = !!cursor && wixBookings.bookings.length >= this.options.batchSize;
      }

      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;
      
      return results;
    } catch (error) {
      console.error('Appointment sync failed:', error);
      results.error = error.message;
      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;
      return results;
    }
  }

  /**
   * Sync orders from Wix to Supabase
   */
  async syncOrders(supabaseUserId = null) {
    const results = {
      synced: 0,
      errors: 0,
      skipped: 0,
      startTime: new Date()
    };

    try {
      const wixApi = await this.initWixApi();

      let cursor = null;
      let hasMore = true;

      while (hasMore) {
        const wixOrders = await wixApi.getOrders({
          limit: this.options.batchSize,
          cursor: cursor
        });
        
        if (!wixOrders?.orders?.length) {
          hasMore = false;
          break;
        }

        for (const order of wixOrders.orders) {
          try {
            // Ensure customer exists
            const buyerEmail = order.buyerInfo?.email || order.contactInfo?.email || order.email;
            let customerId = null;

            if (buyerEmail) {
              const { data: customer } = await supabase
                .from('customers')
                .select('id')
                .eq('email', buyerEmail)
                .maybeSingle();
              customerId = customer?.id || null;
            }

            // Upsert order
            const { error } = await supabase
              .from('orders')
              .upsert({
                wix_order_id: order.id,
                customer_id: customerId,
                order_date: order.dateCreated || order.createdDate || order.date || new Date().toISOString(),
                total_amount: order.priceSummary?.total?.amount || order.totalPrice?.amount || order.total || 0,
                status: order.fulfillmentStatus || order.status || 'pending',
                items: order.lineItems || order.items || []
              }, { onConflict: 'wix_order_id' });

            if (error) {
              console.error(`Failed to sync order ${order.id}:`, error);
              results.errors++;
            } else {
              results.synced++;
            }
          } catch (err) {
            console.error(`Error syncing order ${order.id}:`, err);
            results.errors++;
          }
        }

        // Get next cursor
        cursor = wixOrders.metadata?.cursor || wixOrders.paging?.cursor || wixOrders.cursor;
        hasMore = !!cursor && wixOrders.orders.length >= this.options.batchSize;
      }

      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;
      
      return results;
    } catch (error) {
      console.error('Order sync failed:', error);
      results.error = error.message;
      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;
      return results;
    }
  }

  /**
   * Sync all tables (full sync)
   */
  async syncAll(supabaseUserId = null) {
    const results = {
      customers: null,
      appointments: null,
      orders: null,
      startTime: new Date(),
      endTime: null,
      totalDuration: null
    };

    try {
      // Sync in sequence to maintain referential integrity
      results.customers = await this.syncCustomers(supabaseUserId);
      results.appointments = await this.syncAppointments(supabaseUserId);
      results.orders = await this.syncOrders(supabaseUserId);

      results.endTime = new Date();
      results.totalDuration = results.endTime - results.startTime;

      return results;
    } catch (error) {
      console.error('Full sync failed:', error);
      results.error = error.message;
      results.endTime = new Date();
      results.totalDuration = results.endTime - results.startTime;
      return results;
    }
  }

  /**
   * Format contact name from various Wix API response formats
   */
  formatContactName(contact) {
    if (contact.name?.first || contact.name?.last) {
      return `${contact.name.first || ''} ${contact.name.last || ''}`.trim();
    }
    if (contact.displayName) {
      return contact.displayName;
    }
    if (contact.info?.name?.first || contact.info?.name?.last) {
      return `${contact.info.name.first || ''} ${contact.info.name.last || ''}`.trim();
    }
    if (contact.firstName || contact.lastName) {
      return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    }
    return 'Unknown';
  }
}

module.exports = { AsyncSyncAgent };
