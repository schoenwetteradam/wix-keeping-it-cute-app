import { createClient } from '@supabase/supabase-js';
import { wixContacts as wixContactsApi, wixBookings as wixBookingsApi } from './wix-api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export class SyncService {
  async syncClientsFromWix() {
    try {
      const { data: contactsData } = await wixContactsApi.list({
        limit: 100
      });

      for (const contact of contactsData.contacts || []) {
        await this.upsertClient({
          wix_contact_id: contact.id,
          name: `${contact.name?.first || ''} ${contact.name?.last || ''}`.trim(),
          email: contact.info?.emails?.[0]?.email,
          phone: contact.info?.phones?.[0]?.phone,
          updated_at: new Date().toISOString()
        });
      }

      return { success: true, synced: contactsData.contacts?.length || 0 };
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncBookingsFromWix() {
    try {
      const { data: bookingsData } = await wixBookingsApi.list({
        limit: 100,
        filter: JSON.stringify({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      });

      for (const booking of bookingsData.bookings || []) {
        const client = await this.findOrCreateClientFromBooking(booking);

        await this.upsertAppointment({
          wix_booking_id: booking.id,
          client_id: client?.id,
          appointment_date: booking.bookedEntity?.schedule?.startDate,
          status: booking.status,
          updated_at: new Date().toISOString()
        });
      }

      return { success: true, synced: bookingsData.bookings?.length || 0 };
    } catch (error) {
      console.error('Booking sync error:', error);
      return { success: false, error: error.message };
    }
  }

  async handleContactWebhook(contact) {
    try {
      await this.upsertClient({
        wix_contact_id: contact.id,
        name: `${contact.name?.first || ''} ${contact.name?.last || ''}`.trim(),
        email: contact.info?.emails?.[0]?.email,
        phone: contact.info?.phones?.[0]?.phone,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Contact webhook error:', error);
      throw error;
    }
  }

  async handleBookingWebhook(booking) {
    try {
      const client = await this.findOrCreateClientFromBooking(booking);

      await this.upsertAppointment({
        wix_booking_id: booking.id,
        client_id: client?.id,
        appointment_date: booking.bookedEntity?.schedule?.startDate,
        status: booking.status,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Booking webhook error:', error);
      throw error;
    }
  }

  async findOrCreateClientFromBooking(booking) {
    const contactId = booking.contactDetails?.contactId || booking.contactId;
    if (!contactId) {
      throw new Error('Booking missing contact ID');
    }

    await this.upsertClient({
      wix_contact_id: contactId,
      name: booking.contactDetails?.name?.fullName || booking.contactDetails?.name || '',
      email: booking.contactDetails?.email,
      phone: booking.contactDetails?.phone,
      updated_at: new Date().toISOString()
    });

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('wix_contact_id', contactId)
      .maybeSingle();

    if (error) throw error;
    return client;
  }

  async upsertClient(clientData) {
    const { data, error } = await supabase
      .from('clients')
      .upsert(clientData, {
        onConflict: 'wix_contact_id',
        returning: 'minimal'
      });

    if (error) throw error;
    return data;
  }

  async upsertAppointment(appointmentData) {
    const { data, error } = await supabase
      .from('appointments')
      .upsert(appointmentData, {
        onConflict: 'wix_booking_id',
        returning: 'minimal'
      });

    if (error) throw error;
    return data;
  }
}
