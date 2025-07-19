CREATE TABLE IF NOT EXISTS purchase_receipts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id bigint REFERENCES purchase_orders(id) ON DELETE CASCADE,
  receipt_url text,
  file_name text,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id)
);
