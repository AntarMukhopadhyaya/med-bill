-- Supabase Storage Setup for Store Logos
-- Run this in your Supabase SQL Editor to set up the storage bucket

-- Create the store-logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-logos',
  'store-logos',
  true, -- Public bucket so images can be accessed via URL
  3145728, -- 3MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS (Row Level Security) policies for the store-logos bucket
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'store-logos'
  AND auth.role() = 'authenticated'
);

-- Allow public read access to all images in the bucket
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'store-logos');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'store-logos'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (
  bucket_id = 'store-logos'
  AND auth.role() = 'authenticated'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_store_logos_bucket
ON storage.objects (bucket_id)
WHERE bucket_id = 'store-logos';

CREATE INDEX IF NOT EXISTS idx_store_logos_name
ON storage.objects (name)
WHERE bucket_id = 'store-logos';

-- Optional: Create a function to clean up old logo files when a new one is uploaded
CREATE OR REPLACE FUNCTION cleanup_old_store_logos()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old logo files when store logo_url is updated
  IF OLD.logo_url IS NOT NULL AND NEW.logo_url IS DISTINCT FROM OLD.logo_url THEN
    -- Extract the file path from the old URL and delete the file
    -- This is a simplified version - you might need to adjust based on your URL structure
    PERFORM storage.delete_object('store-logos',
      regexp_replace(OLD.logo_url, '^.*/store-logos/', '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically clean up old logos
-- Note: Only create this trigger if you want automatic cleanup
-- DROP TRIGGER IF EXISTS cleanup_old_store_logos_trigger ON store;
-- CREATE TRIGGER cleanup_old_store_logos_trigger
--   AFTER UPDATE OF logo_url ON store
--   FOR EACH ROW
--   EXECUTE FUNCTION cleanup_old_store_logos();
