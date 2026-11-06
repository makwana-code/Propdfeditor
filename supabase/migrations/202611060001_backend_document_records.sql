-- Backend document capability records. Private PDF objects are stored in Supabase Storage.
create table if not exists public.backend_documents (
  id uuid primary key,
  object_path text not null unique,
  original_name text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  token_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.backend_documents enable row level security;
-- No client policies by design. Only the backend service-role key may access this table.
