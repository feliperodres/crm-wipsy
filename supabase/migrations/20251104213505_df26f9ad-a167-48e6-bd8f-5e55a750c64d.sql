-- Allow public SELECT on questionnaire responses so insert with returning works on /demo
CREATE POLICY "Public can select questionnaire responses"
ON public.demo_questionnaire_responses
FOR SELECT
USING (true);
