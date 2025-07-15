ALTER TABLE staff_chat_messages
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS avatar_url text;
