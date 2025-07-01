CREATE TABLE IF NOT EXISTS loyalty (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id uuid REFERENCES contacts(id),
  name text,
  email text,
  points_balance integer DEFAULT 0,
  redeemed_points integer DEFAULT 0,
  last_activity timestamptz
);

\copy loyalty(name,email,points_balance,redeemed_points,last_activity) FROM 'data/loyalty.csv' CSV HEADER;
