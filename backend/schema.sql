-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE (Role Management & Instructor Data)
create table profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  full_name text,
  mobile_number text,
  role text not null check (role in ('admin', 'user')) default 'user',
  bio text,
  title text, -- e.g. "Senior Software Engineer"
  avatar_url text,
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

-- Ignore drop errors if trigger doesn't exist yet, we just replace it
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SECURITY: Prevent self-promotion to admin
create or replace function public.prevent_role_escalation()
returns trigger as $$
begin
  if (old.role = 'user' and new.role = 'admin') then
    if (current_setting('role') = 'authenticated') then
      return old; -- Ignore the role change if coming from a standard user session
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_update_security on public.profiles;
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
  is_trial boolean default false,
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


---------------------------------------------
-- E-LEARNING SCHEMA EXTENSION (COURSERA)
---------------------------------------------

-- COURSES TABLE
create table courses (
  id uuid default uuid_generate_v4() primary key,
  instructor_id uuid references profiles(id) not null,
  title text not null,
  description text,
  price numeric not null default 0,
  thumbnail_url text,
  is_published boolean default false,
  level text check (level in ('Beginner', 'Intermediate', 'Advanced', 'All Levels')) default 'All Levels',
  language text default 'English',
  estimated_duration text, -- e.g. "4 weeks" or "10 hours"
  skills jsonb default '[]'::jsonb, -- Array of strings
  learning_objectives jsonb default '[]'::jsonb, -- Array of strings
  requirements jsonb default '[]'::jsonb, -- Array of strings
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table courses enable row level security;

create policy "Published courses are viewable by everyone." on courses
  for select using (is_published = true);

create policy "Admins can manage all courses." on courses
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- MODULES TABLE
create table course_modules (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  order_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table course_modules enable row level security;

create policy "Modules for published courses are viewable by everyone." on course_modules
  for select using (
    exists (select 1 from courses where id = course_id and is_published = true)
  );

create policy "Admins can manage all modules." on course_modules
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- LESSONS TABLE
create table lessons (
  id uuid default uuid_generate_v4() primary key,
  module_id uuid references course_modules(id) on delete cascade not null,
  title text not null,
  video_url text, -- Supabase Storage URL or external URL
  duration_seconds integer default 0,
  order_index integer not null default 0,
  is_free_preview boolean default false,
  resources jsonb default '[]'::jsonb, -- Array of {name, url, size, key}
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table lessons enable row level security;

create policy "Lessons metadata is viewable by everyone for published courses." on lessons
  for select using (
     exists (
       select 1 from course_modules cm 
       join courses c on c.id = cm.course_id 
       where cm.id = module_id and c.is_published = true
     )
  );

create policy "Admins can manage all lessons." on lessons
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- QUIZZES TABLE
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid default uuid_generate_v4() primary key,
  module_id uuid references course_modules(id) on delete cascade not null,
  title text not null,
  passing_score_percentage integer default 80,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quizzes for published courses are viewable by everyone." ON quizzes
  FOR SELECT USING (
     exists (
       select 1 from course_modules cm 
       join courses c on c.id = cm.course_id 
       where cm.id = quizzes.module_id and c.is_published = true
     )
  );

CREATE POLICY "Admins can manage all quizzes." ON quizzes
  FOR ALL USING (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references quizzes(id) on delete cascade not null,
  question_text text not null,
  options jsonb not null, -- Array of objects: [{ id: 1, text: "A" }, ...]
  correct_option_id integer not null,
  explanation text,
  order_index integer not null default 0
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions metadata is viewable by everyone." ON questions
  FOR SELECT USING (
      exists (
       select 1 from quizzes q
       join course_modules cm on cm.id = q.module_id
       join courses c on c.id = cm.course_id 
       where q.id = questions.quiz_id and c.is_published = true
     )
  );

CREATE POLICY "Admins can manage all questions." ON questions
  FOR ALL USING (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- COURSE ENROLLMENTS TABLE (For individual course purchases)
create table course_enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  course_id uuid references courses(id) not null,
  payment_id text,
  order_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, course_id)
);

alter table course_enrollments enable row level security;

create policy "Users can view their own enrollments." on course_enrollments
  for select using (auth.uid() = user_id);

create policy "Admins can view all enrollments." on course_enrollments
  for select using (
     exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- USER PROGRESS TABLE
create table lesson_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  lesson_id uuid references lessons(id) on delete cascade not null,
  is_completed boolean default false,
  last_watched_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, lesson_id)
);

alter table lesson_progress enable row level security;

create policy "Users can manage their own progress." on lesson_progress
  for all using (auth.uid() = user_id);

create policy "Admins can view all progress." on lesson_progress
  for select using (
     exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- CERTIFICATES TABLE
CREATE TABLE IF NOT EXISTS certificates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  course_id uuid references courses(id) not null,
  issue_date timestamp with time zone default timezone('utc'::text, now()) not null,
  certificate_url text,
  unique(user_id, course_id)
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificates." ON certificates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage certificates." ON certificates
  FOR ALL USING (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- APP CONFIG TABLE (For Global Settings)
create table app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table app_config enable row level security;

create policy "Everyone can view config." on app_config
  for select using (true);

create policy "Admins can update config." on app_config
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Insert Default Subscription Price (₹100)
insert into app_config (key, value) values ('subscription_price', '100')
on conflict (key) do nothing;

-- SUPPORT MESSAGES TABLE
create table support_messages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'unread', -- 'unread', 'read'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table support_messages enable row level security;

create policy "Anyone can insert support messages." on support_messages
  for insert with check (true);

create policy "Admins can view support messages." on support_messages
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update support messages." on support_messages
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete support messages." on support_messages
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
