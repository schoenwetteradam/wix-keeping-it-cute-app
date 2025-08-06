CREATE OR REPLACE FUNCTION public.process_wix_contact(payload jsonb)
RETURNS void AS $$
DECLARE
  mapped jsonb;
BEGIN
  mapped := jsonb_build_object(
    'wix_contact_id', payload->>'id',
    'first_name', payload->>'firstName',
    'last_name', payload->>'lastName',
    'email', payload->>'primaryEmail',
    'phone', payload->>'primaryPhone',
    'address', payload->'addresses'->0->>'address',
    'company_name', payload->>'company'
  );

  PERFORM generic_upsert('contacts', 'wix_contact_id', mapped);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.process_wix_order(payload jsonb)
RETURNS void AS $$
DECLARE
  mapped jsonb;
BEGIN
  mapped := jsonb_build_object(
    'wix_order_id', payload->>'id',
    'wix_contact_id', payload->>'contactId',
    'booking_id', payload->>'bookingId',
    'status', payload->>'status',
    'payment_status', payload->>'paymentStatus',
    'currency', payload->>'currency',
    'total_amount', payload->'totals'->>'total'
  );

  PERFORM generic_upsert('orders', 'wix_order_id', mapped);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.process_wix_booking(payload jsonb)
RETURNS void AS $$
DECLARE
  mapped jsonb;
BEGIN
  mapped := jsonb_build_object(
    'wix_booking_id', payload->>'id',
    'wix_contact_id', payload->>'contactId',
    'wix_order_id', payload->>'orderId',
    'staff_member_id', COALESCE(payload->>'staffId', payload->>'resourceId'),
    'service_id', payload->>'serviceId',
    'appointment_date', payload->>'start',
    'status', payload->>'status',
    'duration_minutes', payload->>'durationInMinutes',
    'price', payload->'price'->>'amount',
    'notes', payload->>'notes'
  );

  PERFORM generic_upsert('bookings', 'wix_booking_id', mapped);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.process_wix_payment(payload jsonb)
RETURNS void AS $$
DECLARE
  mapped jsonb;
BEGIN
  mapped := jsonb_build_object(
    'wix_payment_id', payload->>'id',
    'wix_order_id', payload->>'orderId',
    'amount_paid', payload->>'amount',
    'currency', payload->>'currency',
    'payment_method', payload->>'method',
    'status', payload->>'status'
  );

  PERFORM generic_upsert('wix_payments', 'wix_payment_id', mapped);
END;
$$ LANGUAGE plpgsql;

