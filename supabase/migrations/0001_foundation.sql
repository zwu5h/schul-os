-- Prepared foundation; not connected to the local MVP or applied remotely.
-- Run on a staging Supabase instance and validate RLS before enabling cloud sync.
begin;
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '', school text not null default '', grade text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.subjects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 140), color text not null default '#9184d7',
  icon text not null default '◎', teacher text not null default '', room text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id)
);
create table public.notes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid, title text not null, content jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (subject_id,user_id) references public.subjects(id,user_id) on delete restrict
);
create table public.canvases (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid, title text not null, snapshot_path text, revision bigint not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (subject_id,user_id) references public.subjects(id,user_id) on delete restrict
);
create table public.files (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid, name text not null, mime_type text not null, storage_path text not null,
  size_bytes bigint not null check (size_bytes >= 0), extracted_text text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (subject_id,user_id) references public.subjects(id,user_id) on delete restrict
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid, title text not null, description text not null default '', due_date date,
  priority text not null default 'normal' check(priority in ('normal','high')),
  status text not null default 'todo' check(status in ('todo','progress','done')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (subject_id,user_id) references public.subjects(id,user_id) on delete restrict
);
create table public.exams (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid, title text not null, exam_date date not null, topics text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (subject_id,user_id) references public.subjects(id,user_id) on delete restrict
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid, starts_at timestamptz not null, ends_at timestamptz not null,
  room text not null default '', teacher text not null default '',
  status text not null default 'regular' check(status in ('regular','cancelled','changed')),
  source text not null check(source in ('manual','webuntis')), external_id text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(ends_at > starts_at), unique(user_id,source,external_id),
  foreign key (subject_id,user_id) references public.subjects(id,user_id) on delete restrict
);
create table public.ai_chats (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid, title text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
  foreign key (subject_id,user_id) references public.subjects(id,user_id) on delete restrict
);
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  chat_id uuid not null, role text not null check(role in ('user','assistant')), content text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (chat_id,user_id) references public.ai_chats(id,user_id) on delete cascade
);
create table public.flashcards (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid, front text not null, back text not null, known boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (subject_id,user_id) references public.subjects(id,user_id) on delete restrict
);

create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at = now(); return new; end; $$;

alter table public.profiles enable row level security;
create policy own_profile on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
do $$ declare table_name text; begin
  foreach table_name in array array['subjects','notes','canvases','files','tasks','exams','lessons','ai_chats','ai_messages','flashcards'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy own_rows on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',table_name);
    execute format('create index on public.%I (user_id, updated_at desc)',table_name);
    execute format('create trigger touch_updated before update on public.%I for each row execute function public.touch_updated_at()',table_name);
  end loop;
end $$;
create index on public.tasks(user_id,due_date);
create index on public.lessons(user_id,starts_at);
create index on public.exams(user_id,exam_date);
create index on public.ai_messages(chat_id,created_at);

insert into storage.buckets (id,name,public,file_size_limit) values ('school-files','school-files',false,26214400) on conflict(id) do nothing;
create policy own_school_files on storage.objects for all to authenticated
  using (bucket_id='school-files' and (storage.foldername(name))[1]=(select auth.uid())::text)
  with check (bucket_id='school-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
