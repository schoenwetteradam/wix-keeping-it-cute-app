-- Migration: Add Wix authentication sessions table
-- Date: 2025-05-23
-- Description: Creates table for storing Wix OAuth sessions and user data

-- Table for storing Wix authentication sessions
CREATE TABLE IF NOT EXISTS wix_auth_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wix_member_id TEXT,
  wix_contact_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  wix_member_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  UNIQUE(supabase_user_id),
  UNIQUE(wix_member_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wix_auth_sessions_member_id ON wix_auth_sessions(wix_member_id);
CREATE INDEX IF NOT EXISTS idx_wix_auth_sessions_supabase_user ON wix_auth_sessions(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_wix_auth_sessions_active ON wix_auth_sessions(is_active) WHERE is_active = TRUE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wix_auth_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_wix_auth_sessions ON wix_auth_sessions;
CREATE TRIGGER trigger_update_wix_auth_sessions
  BEFORE UPDATE ON wix_auth_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_wix_auth_sessions_updated_at();

-- Row level security
ALTER TABLE wix_auth_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own sessions
CREATE POLICY "Users can view own wix sessions" ON wix_auth_sessions
  FOR SELECT USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can update own wix sessions" ON wix_auth_sessions
  FOR UPDATE USING (auth.uid() = supabase_user_id);

CREATE POLICY "Service role can manage all sessions" ON wix_auth_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON wix_auth_sessions TO authenticated;
GRANT ALL ON wix_auth_sessions TO service_role;
