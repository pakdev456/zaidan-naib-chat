-- Add profile information and message editing support.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "anon_read_profile_avatars" ON storage.objects;
CREATE POLICY "anon_read_profile_avatars"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS "anon_upload_profile_avatars" ON storage.objects;
CREATE POLICY "anon_upload_profile_avatars"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS "anon_update_profile_avatars" ON storage.objects;
CREATE POLICY "anon_update_profile_avatars"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'profile-avatars')
WITH CHECK (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS "anon_delete_profile_avatars" ON storage.objects;
CREATE POLICY "anon_delete_profile_avatars"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'profile-avatars');
