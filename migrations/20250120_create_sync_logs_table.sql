-- Migration: Create sync_logs table for async sync agent
-- Date: 2025-01-20
-- Description: Tracks background sync jobs between Wix and Supabase

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'customers', 'appointments', 'orders', 'all'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  synced_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  results JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);

-- Enable Row Level Security
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own sync logs"
  ON sync_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sync logs"
  ON sync_logs FOR ALL
  USING (auth.role() = 'service_role');

