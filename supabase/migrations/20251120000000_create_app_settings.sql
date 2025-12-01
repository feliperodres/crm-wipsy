-- Add is_admin column to profiles if it doesn't exist
alter table public.profiles 
add column if not exists is_admin boolean default false;

-- Create app_settings table
create table if not exists public.app_settings (
  key text primary key,
  value text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.app_settings enable row level security;

-- Create policies
create policy "Allow public read access to app_settings"
  on public.app_settings for select
  using (true);

create policy "Allow admin write access to app_settings"
  on public.app_settings for all
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and is_admin = true
    )
  );

-- Insert default value
insert into public.app_settings (key, value)
values ('landing_theme', 'dark')
on conflict (key) do nothing;

-- Set admin for specific emails (optional, helpful for development)
update public.profiles
set is_admin = true
where email in ('felipe.rodres@gmail.com', 'admin@wipsy.com');
