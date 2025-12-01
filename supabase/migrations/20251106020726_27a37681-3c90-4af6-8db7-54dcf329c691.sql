-- Ensure unique booking per slot
CREATE UNIQUE INDEX IF NOT EXISTS uq_demo_bookings_slot ON public.demo_bookings (time_slot_id);

-- Trigger to mark slot unavailable after booking
CREATE OR REPLACE FUNCTION public.trg_mark_slot_unavailable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.demo_time_slots SET is_available = false WHERE id = NEW.time_slot_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mark_slot_unavailable ON public.demo_bookings;
CREATE TRIGGER mark_slot_unavailable
AFTER INSERT ON public.demo_bookings
FOR EACH ROW
EXECUTE FUNCTION public.trg_mark_slot_unavailable();

-- Atomic booking function
CREATE OR REPLACE FUNCTION public.book_demo_slot(
  p_slot_id uuid,
  p_company_name text,
  p_product_type text,
  p_product_count text,
  p_platform text,
  p_messages_per_month text,
  p_monthly_sales text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_company_size text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_industry text DEFAULT NULL,
  p_main_channel text DEFAULT NULL,
  p_main_challenge text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_response_id uuid;
BEGIN
  -- Validate slot availability (future, available, not booked)
  IF NOT EXISTS (
    SELECT 1 FROM public.demo_time_slots s
    WHERE s.id = p_slot_id
      AND s.is_available = true
      AND s.start_time >= now()
  ) THEN
    RAISE EXCEPTION 'SLOT_NOT_AVAILABLE';
  END IF;

  IF EXISTS (SELECT 1 FROM public.demo_bookings b WHERE b.time_slot_id = p_slot_id) THEN
    RAISE EXCEPTION 'SLOT_ALREADY_BOOKED';
  END IF;

  INSERT INTO public.demo_questionnaire_responses(
    contact_phone, company_name, company_size, product_type, product_count, country, industry,
    messages_per_month, monthly_sales, platform, main_channel, main_challenge, contact_name, contact_email
  ) VALUES (
    p_contact_phone, p_company_name, p_company_size, p_product_type, p_product_count, p_country, p_industry,
    p_messages_per_month, p_monthly_sales, p_platform, p_main_channel, p_main_challenge, p_contact_name, p_contact_email
  ) RETURNING id INTO v_response_id;

  INSERT INTO public.demo_bookings(
    notes, questionnaire_response_id, time_slot_id, status
  ) VALUES (
    p_notes, v_response_id, p_slot_id, 'scheduled'
  ) RETURNING id INTO v_booking_id;

  -- Mark slot unavailable via trigger
  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_demo_slot(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) TO anon, authenticated;