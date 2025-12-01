-- Enable RLS on tables that don't have it
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_orders ENABLE ROW LEVEL SECURITY;

-- These tables already have RLS policies but RLS wasn't enabled
-- Adding the missing RLS policies for the new columns (these were likely created without proper RLS)