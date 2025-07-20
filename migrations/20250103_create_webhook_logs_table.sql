CREATE TABLE IF NOT EXISTS webhook_logs (
  id serial PRIMARY KEY,
  event_type text,
  payload jsonb,
  logged_at timestamptz DEFAULT now()
);
