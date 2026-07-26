-- YouTube Connections Table
-- Stores OAuth tokens AND cached analytics data in a single table.
-- Run this in your Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS youtube_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Channel info
  channel_id TEXT,
  channel_title TEXT,
  channel_description TEXT,
  channel_thumbnail TEXT,

  -- Channel statistics (cached)
  subscriber_count BIGINT DEFAULT 0,
  view_count BIGINT DEFAULT 0,
  video_count BIGINT DEFAULT 0,

  -- Analytics data (cached as JSONB)
  views_trend JSONB DEFAULT '[]',
  audience_age JSONB DEFAULT '[]',
  audience_gender JSONB DEFAULT '{"male": 0, "female": 0}',
  audience_regions JSONB DEFAULT '[]',
  traffic_sources JSONB DEFAULT '[]',
  device_breakdown JSONB DEFAULT '[]',

  -- Cache control
  analytics_updated_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_youtube_connections_user_id ON youtube_connections(user_id);
