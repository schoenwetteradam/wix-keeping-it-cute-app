ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES salon_services(id);
