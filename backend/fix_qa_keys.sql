-- Fix for the Q&A foreign keys

-- 1. Drop the incorrect references to auth.users
alter table public.course_questions drop constraint if exists course_questions_user_id_fkey;
alter table public.course_answers drop constraint if exists course_answers_user_id_fkey;

-- 2. Add the correct references to the profiles table
alter table public.course_questions 
    add constraint course_questions_user_id_fkey 
    foreign key (user_id) references public.profiles(id) 
    on delete cascade;

alter table public.course_answers 
    add constraint course_answers_user_id_fkey 
    foreign key (user_id) references public.profiles(id) 
    on delete cascade;

-- Ensure schema cache is refreshed so our frontend can read the changes immediately
NOTIFY pgrst, 'reload schema';
