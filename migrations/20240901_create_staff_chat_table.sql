CREATE TABLE IF NOT EXISTS staff_chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  username text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
