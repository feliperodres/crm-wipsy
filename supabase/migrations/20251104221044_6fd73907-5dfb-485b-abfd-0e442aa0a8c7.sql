-- Make certain questionnaire fields nullable since they're being removed from the form
ALTER TABLE public.demo_questionnaire_responses 
ALTER COLUMN company_size DROP NOT NULL,
ALTER COLUMN country DROP NOT NULL,
ALTER COLUMN industry DROP NOT NULL,
ALTER COLUMN main_channel DROP NOT NULL,
ALTER COLUMN main_challenge DROP NOT NULL;