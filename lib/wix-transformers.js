// lib/wix-transformers.js
// Provides data transformation helpers for Wix webhook payloads

export class WixDataTransformers {
  static transformBooking(wixBooking) {
    console.log('🔄 Transforming booking:', wixBooking.id);

    const contactDetails = wixBooking.contactDetails || wixBooking.bookedEntity?.contactDetails;
    const bookedEntity = wixBooking.bookedEntity || wixBooking;
    const slot = bookedEntity?.slot || wixBooking.slot || wixBooking;

    const appointmentDate = this.parseWixDate(
      wixBooking.startDate ||
      slot?.startDate ||
      wixBooking.bookedEntity?.startDate
    );

    const endTime = this.parseWixDate(
      wixBooking.endDate ||
      slot?.endDate ||
      wixBooking.bookedEntity?.endDate
    );

    let durationMinutes = 60;
    if (appointmentDate && endTime) {
      durationMinutes = Math.round((new Date(endTime) - new Date(appointmentDate)) / (1000 * 60));
    }

    const customerEmail = this.extractEmail(contactDetails) ||
      this.extractEmail(wixBooking) ||
      wixBooking.contactInfo?.email;

    const customerName = this.extractName(contactDetails) ||
      this.extractName(wixBooking) ||
      'Unknown Customer';

    const transformed = {
      wix_booking_id: wixBooking.id,
      customer_email: customerEmail,
      customer_name: customerName,
      customer_phone: this.extractPhone(contactDetails) || this.extractPhone(wixBooking),
      wix_contact_id: contactDetails?.contactId || contactDetails?.id || wixBooking.contactId,
      service_name: bookedEntity?.title || bookedEntity?.name || bookedEntity?.serviceName || 'Unknown Service',
      service_duration: durationMinutes,
      wix_service_id: bookedEntity?.serviceId || bookedEntity?.id,
      appointment_date: appointmentDate,
      end_time: endTime,
      staff_member: slot?.resource?.name || wixBooking.resource?.name || bookedEntity?.staffMember,
      wix_staff_resource_id: slot?.resource?.id || wixBooking.resource?.id,
      location: slot?.location?.name || wixBooking.location?.name || 'Keeping It Cute Salon & Spa',
      number_of_participants: parseInt(wixBooking.numberOfParticipants || wixBooking.totalParticipants || 1),
      payment_status: (wixBooking.paymentStatus || 'UNDEFINED').toLowerCase(),
      status: (wixBooking.status || 'CONFIRMED').toLowerCase(),
      business_id: wixBooking.businessId || process.env.WIX_SITE_ID,
      revision: parseInt(wixBooking.revision) || 1,
      notes: wixBooking.additionalInformation || wixBooking.notes,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      raw_data: wixBooking
    };

    console.log('✅ Booking transformed:', {
      id: transformed.wix_booking_id,
      customer: transformed.customer_name,
      service: transformed.service_name,
      date: transformed.appointment_date
    });

    return transformed;
  }

  static transformContact(wixContact) {
    console.log('🔄 Transforming contact:', wixContact.id);

    const info = wixContact.info || wixContact;
    const name = info.name || {};
    const emails = info.emails || [];
    const phones = info.phones || [];
    const addresses = info.addresses || [];

    return {
      wix_contact_id: wixContact.id,
      first_name: name.first || info.firstName || '',
      last_name: name.last || info.lastName || '',
      email: emails[0]?.email || info.email || wixContact.email,
      phone: phones[0]?.phone || info.phone || wixContact.phone,
      address_line1: addresses[0]?.street || '',
      city: addresses[0]?.city || '',
      state: addresses[0]?.subdivision || '',
      zip_code: addresses[0]?.zipCode || '',
      country: addresses[0]?.country || '',
      created_at: this.parseWixDate(wixContact.createdDate) || new Date().toISOString(),
      updated_at: this.parseWixDate(wixContact.updatedDate) || new Date().toISOString(),
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      payload: wixContact
    };
  }

  static transformOrder(wixOrder) {
    console.log('🔄 Transforming order:', wixOrder.id);

    const billingInfo = wixOrder.billingInfo || {};
    const buyerInfo = wixOrder.buyerInfo || {};
    const totals = wixOrder.totals || {};

    return {
      wix_order_id: wixOrder.id,
      customer_email: buyerInfo.email || billingInfo.email || wixOrder.customerEmail,
      customer_name: `${buyerInfo.firstName || billingInfo.firstName || ''} ${buyerInfo.lastName || billingInfo.lastName || ''}`.trim(),
      wix_contact_id: buyerInfo.contactId || wixOrder.contactId,
      order_number: wixOrder.number || wixOrder.orderNumber,
      status: (wixOrder.status || 'PENDING').toLowerCase(),
      subtotal: parseFloat(totals.subtotal || wixOrder.subtotal || 0),
      tax_amount: parseFloat(totals.tax || wixOrder.tax || 0),
      total_amount: parseFloat(totals.total || wixOrder.total || 0),
      currency: wixOrder.currency || 'USD',
      created_at: this.parseWixDate(wixOrder.dateCreated) || new Date().toISOString(),
      updated_at: this.parseWixDate(wixOrder.dateUpdated) || new Date().toISOString(),
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      payload: wixOrder
    };
  }

  static parseWixDate(dateString) {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toISOString();
    } catch (error) {
      console.error('❌ Date parsing error:', error);
      return null;
    }
  }

  static extractEmail(data) {
    if (!data) return null;
    return data.email ||
      data.emails?.[0]?.email ||
      data.contactDetails?.email ||
      data.buyerInfo?.email ||
      data.billingInfo?.email ||
      null;
  }

  static extractName(data) {
    if (!data) return null;
    if (data.firstName || data.lastName) {
      return `${data.firstName || ''} ${data.lastName || ''}`.trim();
    }
    if (data.name?.first || data.name?.last) {
      return `${data.name.first || ''} ${data.name.last || ''}`.trim();
    }
    if (data.contactDetails?.firstName || data.contactDetails?.lastName) {
      return `${data.contactDetails.firstName || ''} ${data.contactDetails.lastName || ''}`.trim();
    }
    return data.name || data.displayName || null;
  }

  static extractPhone(data) {
    if (!data) return null;
    return data.phone ||
      data.phones?.[0]?.phone ||
      data.contactDetails?.phone ||
      null;
  }
}
