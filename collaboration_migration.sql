-- Collaboration System Migration FIX
-- Run this in Supabase SQL Editor to fix the FK references
-- The issue: sender_id/receiver_id referenced auth.users instead of public.users
-- PostgREST (Supabase client) can only join through public schema FKs

-- Step 1: Drop existing tables (if they exist) to recreate cleanly
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS collaboration_requests CASCADE;

-- Step 2: Recreate collaboration_requests with FKs to public.users
CREATE TABLE collaboration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id bigint REFERENCES projects(id) ON DELETE SET NULL,
  campaign_id bigint REFERENCES campaigns(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  budget TEXT,
  timeline TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Recreate chat_messages
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id uuid NOT NULL REFERENCES collaboration_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create indexes
CREATE INDEX idx_collab_requests_sender ON collaboration_requests(sender_id);
CREATE INDEX idx_collab_requests_receiver ON collaboration_requests(receiver_id);
CREATE INDEX idx_collab_requests_status ON collaboration_requests(status);
CREATE INDEX idx_collab_requests_project ON collaboration_requests(project_id);
CREATE INDEX idx_collab_requests_campaign ON collaboration_requests(campaign_id);
CREATE INDEX idx_chat_messages_collab ON chat_messages(collaboration_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- Step 5: Enable RLS
ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS policies for collaboration_requests
CREATE POLICY "Users can view own collaboration requests"
  ON collaboration_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send collaboration requests"
  ON collaboration_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can update collaboration requests"
  ON collaboration_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Step 7: RLS policies for chat_messages
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_requests cr
      WHERE cr.id = chat_messages.collaboration_id
      AND (cr.sender_id = auth.uid() OR cr.receiver_id = auth.uid())
      AND cr.status = 'accepted'
    )
  );

CREATE POLICY "Users can send chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM collaboration_requests cr
      WHERE cr.id = chat_messages.collaboration_id
      AND (cr.sender_id = auth.uid() OR cr.receiver_id = auth.uid())
      AND cr.status = 'accepted'
    )
  );

-- Step 8: Enable Supabase Realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
