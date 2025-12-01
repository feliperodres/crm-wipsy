-- Add support for multiple images per product
-- First, remove the old image_url column and add new columns for multiple images
ALTER TABLE public.products DROP COLUMN image_url;

-- Add new columns for multiple images support
ALTER TABLE public.products ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN cover_image_index INTEGER DEFAULT 0;