/*
# Create Monochrome Chat App Schema (No pgcrypto dependency)

1. New Tables
- `users`: id (uuid PK), username (unique), password (text), status_message, is_admin, created_at
- `chats`: id (uuid PK), name (nullable for DMs), is_group, created_by, created_at
- `chat_participants`: id (uuid PK), chat_id, user_id, joined_at
- `messages`: id (uuid PK), chat_id, sender_id, message_text, is_read, created_at
- `presence`: id (uuid PK), user_id, chat_id, last_seen, is_online

2. Security
- Enable RLS on all tables
- Policies allow anon+authenticated CRUD

3. Realtime
- Enable Supabase Realtime on messages, chats, and chat_participants tables

4. Seed Data
- Create admin account: username "sudo", password "chatgabut13"
*/

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  status_message text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================
-- TABLE: chats
-- ============================================
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  is_group boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chats" ON chats;
CREATE POLICY "anon_select_chats" ON chats FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chats" ON chats;
CREATE POLICY "anon_insert_chats" ON chats FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chats" ON chats;
CREATE POLICY "anon_update_chats" ON chats FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chats" ON chats;
CREATE POLICY "anon_delete_chats" ON chats FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================
-- TABLE: chat_participants
-- ============================================
CREATE TABLE IF NOT EXISTS chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat_participants" ON chat_participants;
CREATE POLICY "anon_select_chat_participants" ON chat_participants FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_participants" ON chat_participants;
CREATE POLICY "anon_insert_chat_participants" ON chat_participants FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat_participants" ON chat_participants;
CREATE POLICY "anon_delete_chat_participants" ON chat_participants FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================
-- TABLE: messages
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_messages" ON messages;
CREATE POLICY "anon_update_messages" ON messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_messages" ON messages;
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================
-- TABLE: presence
-- ============================================
CREATE TABLE IF NOT EXISTS presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, chat_id)
);

ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_presence" ON presence;
CREATE POLICY "anon_select_presence" ON presence FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_presence" ON presence;
CREATE POLICY "anon_insert_presence" ON presence FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_presence" ON presence;
CREATE POLICY "anon_update_presence" ON presence FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_presence" ON presence;
CREATE POLICY "anon_delete_presence" ON presence FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_user_id ON presence(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_chat_id ON presence(chat_id);

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE presence;

-- ============================================
-- SEED: Admin account (username: sudo, password: chatgabut13)
-- ============================================
INSERT INTO users (username, password, is_admin)
SELECT 'sudo', 'chatgabut13', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'sudo');