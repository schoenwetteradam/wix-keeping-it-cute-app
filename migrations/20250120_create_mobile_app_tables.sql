-- Mobile App Database Schema
-- Customers/Contacts table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wix_contact_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments/Schedules table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wix_booking_id TEXT UNIQUE,
  customer_id UUID REFERENCES customers(id),
  service_name TEXT,
  staff_member TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category TEXT,
  current_quantity INTEGER DEFAULT 0,
  minimum_quantity INTEGER DEFAULT 0,
  unit_cost DECIMAL(10,2),
  supplier TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory audits table
CREATE TABLE IF NOT EXISTS inventory_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id),
  previous_quantity INTEGER,
  new_quantity INTEGER,
  audited_by TEXT,
  notes TEXT,
  audit_date TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wix_order_id TEXT UNIQUE,
  customer_id UUID REFERENCES customers(id),
  order_date TIMESTAMPTZ,
  total_amount DECIMAL(10,2),
  status TEXT,
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_wix_booking_id ON appointments(wix_booking_id);
CREATE INDEX IF NOT EXISTS idx_customers_wix_contact_id ON customers(wix_contact_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audits_inventory_id ON inventory_audits(inventory_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_wix_order_id ON orders(wix_order_id);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
-- Only authenticated users can read
CREATE POLICY "Enable read for authenticated users" ON appointments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" ON inventory
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" ON inventory_audits
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" ON orders
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow inserts for authenticated users
CREATE POLICY "Enable insert for authenticated users" ON appointments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON inventory_audits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow updates for authenticated users
CREATE POLICY "Enable update for authenticated users" ON appointments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON customers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON inventory
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

