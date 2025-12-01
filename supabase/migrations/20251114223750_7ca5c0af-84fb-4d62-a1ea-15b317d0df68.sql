-- Add ai_messages_blocked field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ai_messages_blocked BOOLEAN DEFAULT false;

-- Create function to check and update AI message block status
CREATE OR REPLACE FUNCTION public.check_and_update_ai_block_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan RECORD;
  total_limit INTEGER;
BEGIN
  -- Get user's plan
  SELECT * INTO user_plan
  FROM get_user_current_plan(NEW.user_id)
  LIMIT 1;

  -- Calculate total limit (plan + extra purchased)
  total_limit := COALESCE(user_plan.max_ai_messages, 100) + COALESCE(NEW.extra_messages_purchased, 0);

  -- Update blocked status based on usage
  IF NEW.ai_messages_used >= total_limit THEN
    -- Block if limit reached and no extra message cost (FREE plan)
    IF user_plan.extra_message_cost IS NULL OR user_plan.extra_message_cost = 0 THEN
      UPDATE public.profiles
      SET ai_messages_blocked = true
      WHERE user_id = NEW.user_id;
    END IF;
  ELSE
    -- Unblock if under limit
    UPDATE public.profiles
    SET ai_messages_blocked = false
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to automatically update block status
DROP TRIGGER IF EXISTS trigger_check_ai_block_status ON public.usage_counters;
CREATE TRIGGER trigger_check_ai_block_status
  AFTER INSERT OR UPDATE ON public.usage_counters
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_update_ai_block_status();

-- Create function to reset monthly blocks (can be called by cron job)
CREATE OR REPLACE FUNCTION public.reset_monthly_ai_blocks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset all blocks at the start of a new month
  UPDATE public.profiles
  SET ai_messages_blocked = false
  WHERE ai_messages_blocked = true;
END;
$$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_ai_blocked 
ON public.profiles(user_id, ai_messages_blocked) 
WHERE ai_messages_blocked = true;