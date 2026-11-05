-- ProPDF Studio private cloud storage setup.
-- Run once in Supabase SQL Editor before enabling VITE_SUPABASE_* in production.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdf-documents', 'pdf-documents', false, 52428800, array['application/pdf'])
on conflict (id) do update
set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

create table if not exists public.saved_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 255),
  storage_path text not null unique,
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  editor_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists saved_documents_user_created_idx
  on public.saved_documents (user_id, created_at desc);

alter table public.saved_documents enable row level security;

drop policy if exists "Users can read their own saved documents" on public.saved_documents;
create policy "Users can read their own saved documents"
  on public.saved_documents for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own saved documents" on public.saved_documents;
create policy "Users can create their own saved documents"
  on public.saved_documents for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own saved documents" on public.saved_documents;
create policy "Users can update their own saved documents"
  on public.saved_documents for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own saved documents" on public.saved_documents;
create policy "Users can delete their own saved documents"
  on public.saved_documents for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can access their own PDF objects" on storage.objects;
create policy "Users can access their own PDF objects"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'pdf-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'pdf-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
