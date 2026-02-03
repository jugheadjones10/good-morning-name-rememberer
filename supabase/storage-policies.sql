-- Storage Policies for children-photos bucket
-- Run these after creating the bucket in Supabase Dashboard

-- First, create the bucket via Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "Create a new bucket"
-- 3. Name: children-photos
-- 4. Check "Public bucket"

-- Since we're using simple email auth (no Supabase Auth),
-- we make the storage policies permissive for this trusted small group app.

-- Allow anyone to upload files
CREATE POLICY "Anyone can upload photos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'children-photos');

-- Allow anyone to delete files
CREATE POLICY "Anyone can delete photos"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'children-photos');

-- Allow anyone to view photos (public bucket)
CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT
TO anon, authenticated, public
USING (bucket_id = 'children-photos');
