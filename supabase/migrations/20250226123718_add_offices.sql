-- Create offices table
create table if not exists public.offices (
  id uuid default gen_random_uuid() primary key not null,
  name text not null unique,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add office_id to work_hours table
alter table public.work_hours
add column office_id uuid references public.offices(id) null;

-- Add is_remote column to work_hours table
alter table public.work_hours
add column is_remote boolean default false not null;

-- Enable RLS for offices
alter table public.offices disable row level security;


-- Insert default office for remote work
insert into public.offices (id, name, address)
values ('00000000-0000-0000-0000-000000000000', 'Trabajo a distancia', null);

-- Create trigger for updated_at
create trigger handle_updated_at
  before update on public.offices
  for each row
  execute function public.handle_updated_at();

-- Create indexes
create index if not exists work_hours_office_id_idx on public.work_hours (office_id);

