-- COURSE QUESTIONS
create table course_questions (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references courses on delete cascade not null,
  lesson_id uuid references lessons on delete cascade,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table course_questions enable row level security;

create policy "Course questions are viewable by everyone." on course_questions
  for select using (true);

create policy "Users can insert their own course questions." on course_questions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own course questions." on course_questions
  for update using (auth.uid() = user_id);

create policy "Admins can delete course questions." on course_questions
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- COURSE ANSWERS / REPLIES
create table course_answers (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references course_questions on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  is_instructor_reply boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table course_answers enable row level security;

create policy "Course answers are viewable by everyone." on course_answers
  for select using (true);

create policy "Users can insert their own course answers." on course_answers
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own course answers." on course_answers
  for update using (auth.uid() = user_id);

create policy "Admins can delete answers." on course_answers
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
