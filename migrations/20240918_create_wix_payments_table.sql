CREATE TABLE IF NOT EXISTS wix_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  wix_payment_id text UNIQUE,
  wix_order_id text,
  wix_booking_id text,
  amount numeric,
  currency text,
  status text,
  payload jsonb,
  processed_at timestamptz,
  appointment_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
