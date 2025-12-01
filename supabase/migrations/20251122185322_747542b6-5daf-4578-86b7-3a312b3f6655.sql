-- Create oauth_states table for CSRF protection
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL UNIQUE,
  shop_domain TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '10 minutes')
);

-- Index for cleaning up expired states
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON public.oauth_states(expires_at);

-- Index for faster lookups by state
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON public.oauth_states(state);

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own states
CREATE POLICY "Users can view own oauth states"
  ON public.oauth_states
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own states
CREATE POLICY "Users can insert own oauth states"
  ON public.oauth_states
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Allow deletion of expired states (for cleanup)
CREATE POLICY "Allow deletion of expired states"
  ON public.oauth_states
  FOR DELETE
  USING (expires_at < now());