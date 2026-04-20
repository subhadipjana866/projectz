-- Supabase Migration: Create Tables for Creator Profiles and YouTube Credentials
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Create creator_profiles table
CREATE TABLE IF NOT EXISTS creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  bio TEXT,
  title TEXT DEFAULT 'Content Creator & Influencer',
  
  -- Metrics
  total_reach TEXT DEFAULT '0',
  engagement_rate TEXT DEFAULT '0%',
  avg_views TEXT DEFAULT '0',
  campaign_rate TEXT DEFAULT '$0',
  
  -- Portfolio info
  portfolio_link TEXT,
  portfolio_items JSONB DEFAULT '[]',
  
  -- Social media presence
  instagram_handle TEXT,
  instagram_followers TEXT,
  tiktok_handle TEXT,
  tiktok_followers TEXT,
  youtube_channel_id TEXT,
  youtube_channel_name TEXT,
  youtube_followers TEXT,
  
  -- Other metadata
  profile_picture_url TEXT,
  banner_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create youtube_credentials table (for secure token storage)
CREATE TABLE IF NOT EXISTS youtube_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  
  -- YouTube OAuth tokens (encrypted in production)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_uri TEXT,
  client_id TEXT,
  client_secret TEXT,
  scopes JSONB DEFAULT '[]',
  
  -- Channel info
  channel_id TEXT,
  channel_title TEXT,
  channel_description TEXT,
  
  -- Token metadata
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_refreshed_at TIMESTAMP WITH TIME ZONE,
  is_connected BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create youtube_analytics table (for caching analytics data)
CREATE TABLE IF NOT EXISTS youtube_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  
  -- Channel statistics
  view_count INT DEFAULT 0,
  subscriber_count INT DEFAULT 0,
  video_count INT DEFAULT 0,
  
  -- Audience demographics
  audience_age_distribution JSONB DEFAULT '[]',
  audience_gender_distribution JSONB DEFAULT '{"male": 0, "female": 0}',
  audience_regions JSONB DEFAULT '[]',
  
  -- Engagement metrics
  engagement_rate DECIMAL(5, 2) DEFAULT 0.0,
  average_views INT DEFAULT 0,
  
  -- Cache control
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_email ON creator_profiles(email);
CREATE INDEX IF NOT EXISTS idx_youtube_credentials_user_id ON youtube_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_credentials_email ON youtube_credentials(email);
CREATE INDEX IF NOT EXISTS idx_youtube_analytics_user_id ON youtube_analytics(user_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_analytics ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for creator_profiles
CREATE POLICY "Users can view their own profile"
  ON creator_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON creator_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON creator_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view verified creator profiles" 
  ON creator_profiles FOR SELECT
  USING (verified = TRUE);

-- 7. Create RLS policies for youtube_credentials (very restricted)
CREATE POLICY "Users can view their own credentials"
  ON youtube_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials"
  ON youtube_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials"
  ON youtube_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 8. Create RLS policies for youtube_analytics
CREATE POLICY "Users can view their own analytics"
  ON youtube_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics"
  ON youtube_analytics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
  ON youtube_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);
