import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function refresh() {
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('appointment_date', now.toISOString())
    .lt('appointment_date', nextWeek.toISOString());

  if (error) {
    console.error('Failed to fetch bookings:', error.message);
    return;
  }

  const upsertData = (bookings || []).map(b => ({
    booking_id: b.id,
    appointment_date: b.appointment_date,
    staff_id: b.staff_id,
    status: b.status,
    payment_status: b.payment_status
  }));

  const { error: upsertError } = await supabase
    .from('upcoming_bookings')
    .upsert(upsertData, { onConflict: 'booking_id', ignoreDuplicates: false });

  if (upsertError) {
    console.error('Failed to refresh upcoming bookings:', upsertError.message);
  } else {
    console.log(`Refreshed ${upsertData.length} upcoming bookings`);
  }
}

refresh().then(() => process.exit());
