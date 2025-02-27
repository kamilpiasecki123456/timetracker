-- Enable Row Level Security
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- Create users table
create table if not exists public.users (
    id uuid references auth.users on delete cascade not null primary key,
    email text not null unique,
    full_name text not null,
    role text not null check (role in ('admin', 'employee')) default 'employee',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create work_hours table
create table if not exists public.work_hours (
    id uuid default gen_random_uuid() primary key not null,
    user_id uuid references public.users on delete cascade not null,
    date date not null,
    start_time time not null,
    end_time time,
    total_hours numeric(5,2),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.users disable row level security;
alter table public.work_hours disable row level security;


-- Create functions and triggers
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

-- Create triggers
create trigger handle_updated_at
    before update on public.users
    for each row
    execute function public.handle_updated_at();

create trigger handle_updated_at
    before update on public.work_hours
    for each row
    execute function public.handle_updated_at();

-- Create indexes
create index if not exists users_email_idx on public.users (email);
create index if not exists work_hours_user_id_idx on public.work_hours (user_id);
create index if not exists work_hours_date_idx on public.work_hours (date);

