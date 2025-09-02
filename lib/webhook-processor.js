// lib/webhook-processor.js
// Handles processing Wix webhooks with dependency checking and retries

import { wixAPI } from './wix-api-client';
import { WixDataTransformers } from './wix-transformers';

export class WebhookProcessor {
  constructor(supabase) {
    this.supabase = supabase;
    this.processingQueue = [];
  }

  async processWebhook(eventType, eventData) {
    console.log(`📥 Processing webhook: ${eventType}`);
    try {
      const task = {
        id: Date.now() + Math.random(),
        eventType,
        eventData,
        dependencies: this.getDependencies(eventType),
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date()
      };
      await this.executeWithDependencies(task);
      return { success: true, eventType };
    } catch (error) {
      console.error(`❌ Webhook processing failed for ${eventType}:`, error);
      await this.logFailedWebhook(eventType, eventData, error);
      throw error;
    }
  }

  getDependencies(eventType) {
    const dependencies = {
      'booking_created': ['contact_exists'],
      'booking_updated': ['contact_exists', 'booking_exists'],
      'order_created': ['contact_exists'],
      'order_updated': ['contact_exists', 'order_exists']
    };
    return dependencies[eventType] || [];
  }

  async executeWithDependencies(task) {
    const { eventType, eventData, dependencies } = task;
    for (const dependency of dependencies) {
      const satisfied = await this.checkDependency(dependency, eventData);
      if (!satisfied) {
        await this.resolveDependency(dependency, eventData);
      }
    }
    switch (eventType) {
      case 'booking_created':
      case 'booking_updated':
        return await this.processBooking(eventData);
      case 'contact_created':
      case 'contact_updated':
        return await this.processContact(eventData);
      case 'order_created':
      case 'order_updated':
        return await this.processOrder(eventData);
      default:
        console.log(`⚠️ Unknown event type: ${eventType}`);
        return await this.logUnknownEvent(eventType, eventData);
    }
  }

  async checkDependency(dependency, eventData) {
    switch (dependency) {
      case 'contact_exists': {
        const contactEmail = WixDataTransformers.extractEmail(eventData);
        if (!contactEmail) return true;
        const { data: contact } = await this.supabase
          .from('contacts')
          .select('id')
          .eq('email', contactEmail)
          .maybeSingle();
        return !!contact;
      }
      case 'booking_exists': {
        const wixBookingId = eventData.id || eventData.bookingId;
        if (!wixBookingId) return true;
        const { data: booking } = await this.supabase
          .from('bookings')
          .select('id')
          .eq('wix_booking_id', wixBookingId)
          .maybeSingle();
        return !!booking;
      }
      default:
        return true;
    }
  }

  async resolveDependency(dependency, eventData) {
    console.log(`🔧 Resolving dependency: ${dependency}`);
    switch (dependency) {
      case 'contact_exists': {
        const contactEmail = WixDataTransformers.extractEmail(eventData);
        if (contactEmail) {
          await this.fetchAndCreateContact(contactEmail);
        }
        break;
      }
      default:
        break;
    }
  }

  async fetchAndCreateContact(email) {
    try {
      const wixContacts = await wixAPI.makeRequest('/contacts/v4/contacts/query', 'POST', {
        query: {
          filter: { email: { $eq: email } },
          paging: { limit: 1 }
        }
      });
      if (wixContacts.contacts && wixContacts.contacts.length > 0) {
        const wixContact = wixContacts.contacts[0];
        const contactRecord = WixDataTransformers.transformContact(wixContact);
        await this.supabase
          .from('contacts')
          .upsert(contactRecord, { onConflict: 'email' });
        console.log(`✅ Created missing contact: ${email}`);
      }
    } catch (error) {
      console.error(`❌ Failed to fetch contact ${email}:`, error);
    }
  }

  async processBooking(bookingData) {
    const bookingRecord = WixDataTransformers.transformBooking(bookingData);
    if (bookingRecord.customer_email) {
      const { data: customer } = await this.supabase
        .from('contacts')
        .select('id')
        .eq('email', bookingRecord.customer_email)
        .maybeSingle();
      if (customer) {
        bookingRecord.customer_id = customer.id;
      }
    }
    if (bookingRecord.service_name) {
      const { data: service } = await this.supabase
        .from('salon_services')
        .select('id')
        .or(`name.ilike.%${bookingRecord.service_name}%,wix_service_id.eq.${bookingRecord.wix_service_id}`)
        .maybeSingle();
      if (service) {
        bookingRecord.service_id = service.id;
        const { data: serviceDetails } = await this.supabase
          .from('salon_services')
          .select('price')
          .eq('id', service.id)
          .single();
        if (serviceDetails) {
          bookingRecord.total_price = serviceDetails.price;
        }
      }
    }
    if (bookingRecord.staff_member) {
      const { data: staff } = await this.supabase
        .from('staff')
        .select('id')
        .ilike("first_name || ' ' || last_name", `%${bookingRecord.staff_member}%`)
        .maybeSingle();
      if (staff) {
        bookingRecord.staff_id = staff.id;
      }
    }
    const { data, error } = await this.supabase
      .from('bookings')
      .upsert(bookingRecord, { onConflict: 'wix_booking_id' })
      .select()
      .single();
    if (error) throw error;
    console.log(`✅ Booking processed: ${bookingRecord.wix_booking_id}`);
    return data;
  }

  async processContact(contactData) {
    const contactRecord = WixDataTransformers.transformContact(contactData);
    const { data, error } = await this.supabase
      .from('contacts')
      .upsert(contactRecord, { onConflict: 'wix_contact_id' })
      .select()
      .single();
    if (error) throw error;
    console.log(`✅ Contact processed: ${contactRecord.email}`);
    return data;
  }

  async processOrder(orderData) {
    const orderRecord = WixDataTransformers.transformOrder(orderData);
    if (orderRecord.customer_email) {
      const { data: customer } = await this.supabase
        .from('contacts')
        .select('id')
        .eq('email', orderRecord.customer_email)
        .maybeSingle();
      if (customer) {
        orderRecord.customer_id = customer.id;
      }
    }
    const { data, error } = await this.supabase
      .from('orders')
      .upsert(orderRecord, { onConflict: 'wix_order_id' })
      .select()
      .single();
    if (error) throw error;
    console.log(`✅ Order processed: ${orderRecord.wix_order_id}`);
    return data;
  }

  async logFailedWebhook(eventType, eventData, error) {
    await this.supabase
      .from('webhook_logs')
      .insert({
        event_type: eventType,
        webhook_status: 'failed',
        error_message: error.message,
        data: {
          error: error.message,
          stack: error.stack,
          event_data: eventData,
          timestamp: new Date().toISOString()
        }
      });
  }

  async logUnknownEvent(eventType, eventData) {
    await this.supabase
      .from('webhook_logs')
      .insert({
        event_type: 'unknown_webhook_event',
        webhook_status: 'logged',
        data: {
          event_type: eventType,
          event_data: eventData,
          timestamp: new Date().toISOString()
        }
      });
    return { type: 'unknown', eventType, logged: true };
  }
}

export default WebhookProcessor;
