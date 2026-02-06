-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE (Role Management)
create table profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  full_name text,
  mobile_number text,
  role text not null check (role in ('admin', 'user')) default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- NOTES TABLE
create table notes (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  subject text not null,
  price numeric not null check (price >= 1),
  file_url text not null, -- Secured PDF URL
  preview_url text not null, -- Public preview Image/PDF URL
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table notes enable row level security;

-- Policies for notes
create policy "Notes are viewable by everyone." on notes
  for select using (is_active = true);

create policy "Admins can insert notes." on notes
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update notes." on notes
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- PURCHASES TABLE
create table purchases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  note_id uuid references notes not null,
  payment_id text not null,
  order_id text not null,
  amount numeric not null,
  status text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table purchases enable row level security;

-- Policies for purchases
create policy "Users can view their own purchases." on purchases
  for select using (auth.uid() = user_id);

create policy "Admins can view all purchases." on purchases
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- TRIGGER for handling new user signup to create profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SECURITY: Prevent self-promotion to admin
create or replace function public.prevent_role_escalation()
returns trigger as $$
begin
  if (old.role = 'user' and new.role = 'admin') then
    -- Only allow the service_role or an existing admin to promote someone
    -- In Supabase, the trigger runs as the current user's role unless specified.
    -- We can check the auth.jwt() claims or simply block it from the standard API.
    if (current_setting('role') = 'authenticated') then
      return old; -- Ignore the role change if coming from a standard user session
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_update_security
  before update on public.profiles
  for each row execute procedure public.prevent_role_escalation();


-- SUBSCRIPTIONS TABLE
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  plan_type text not null default 'pro', -- 'pro'
  start_date timestamp with time zone default timezone('utc'::text, now()) not null,
  end_date timestamp with time zone not null,
  payment_id text not null,
  order_id text not null,
  amount numeric not null,
  status text not null, -- 'active', 'expired'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table subscriptions enable row level security;

-- Policies for subscriptions
create policy "Users can view their own subscriptions." on subscriptions
  for select using (auth.uid() = user_id);

create policy "Admins can view all subscriptions." on subscriptions
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- REVIEWS TABLE
create table reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  note_id uuid references notes not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, note_id) -- One review per note per user
);

-- Turn on RLS
alter table reviews enable row level security;

-- Policies for reviews
create policy "Reviews are viewable by everyone." on reviews
  for select using (true);

