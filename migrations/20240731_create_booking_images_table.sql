CREATE TABLE IF NOT EXISTS booking_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  file_url text,
  file_name text,
  uploaded_at timestamptz DEFAULT now(),
  file_type text
);
