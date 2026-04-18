-- Enable pgvector
create extension if not exists vector;

-- Sessions
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  title       text not null default 'Untitled session',
  created_at  timestamptz default now(),
  ended_at    timestamptz,
  summary     text,
  notes       text default '',
  duration_sec int default 0
);

-- Transcript chunks
create table if not exists public.transcript_chunks (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid references public.sessions on delete cascade not null,
  chunk_index  int not null,
  text         text not null,
  timestamp_ms bigint not null,
  duration_sec float not null
);

-- Suggestion batches
create table if not exists public.suggestion_batches (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid references public.sessions on delete cascade not null,
  batch_index         int not null,
  timestamp_ms        bigint not null,
  transcript_snapshot text
);

-- Suggestions
create table if not exists public.suggestions (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions on delete cascade not null,
  batch_id   uuid references public.suggestion_batches on delete cascade not null,
  type       text not null,
  preview    text not null,
  full_context text not null,
  timestamp_ms bigint not null
);

-- Chat messages
create table if not exists public.chat_messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid references public.sessions on delete cascade not null,
  role         text not null check (role in ('user','assistant')),
  content      text not null,
  timestamp_ms bigint not null,
  linked_suggestion_id uuid references public.suggestions
);

-- Vector embeddings for RAG (768-dim for nomic-embed-text-v1_5 via Groq)
create table if not exists public.transcript_embeddings (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions on delete cascade not null,
  chunk_id   uuid references public.transcript_chunks on delete cascade not null,
  content    text not null,
  embedding  vector(768)
);

-- Indexes
create index if not exists idx_sessions_user on public.sessions(user_id);
create index if not exists idx_chunks_session on public.transcript_chunks(session_id, chunk_index);
create index if not exists idx_batches_session on public.suggestion_batches(session_id);
create index if not exists idx_suggestions_session on public.suggestions(session_id);
create index if not exists idx_chat_session on public.chat_messages(session_id);
create index if not exists idx_embeddings_session on public.transcript_embeddings(session_id);
create index if not exists idx_embeddings_vector
  on public.transcript_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Row Level Security: users only see their own data
alter table public.sessions           enable row level security;
alter table public.transcript_chunks  enable row level security;
alter table public.suggestion_batches enable row level security;
alter table public.suggestions        enable row level security;
alter table public.chat_messages      enable row level security;
alter table public.transcript_embeddings enable row level security;

create policy "own sessions"       on public.sessions           for all using (auth.uid() = user_id);
create policy "own chunks"         on public.transcript_chunks  for all using (session_id in (select id from public.sessions where user_id = auth.uid()));
create policy "own batches"        on public.suggestion_batches for all using (session_id in (select id from public.sessions where user_id = auth.uid()));
create policy "own suggestions"    on public.suggestions        for all using (session_id in (select id from public.sessions where user_id = auth.uid()));
create policy "own chat"           on public.chat_messages      for all using (session_id in (select id from public.sessions where user_id = auth.uid()));
create policy "own embeddings"     on public.transcript_embeddings for all using (session_id in (select id from public.sessions where user_id = auth.uid()));

-- Match function for RAG similarity search
create or replace function match_transcript_chunks(
  query_embedding vector(768),
  match_session_id uuid,
  match_count int default 5
) returns table (
  id uuid,
  content text,
  similarity float
) language plpgsql as $$
begin
  return query
  select
    te.id,
    te.content,
    1 - (te.embedding <=> query_embedding) as similarity
  from public.transcript_embeddings te
  where te.session_id = match_session_id
  order by te.embedding <=> query_embedding
  limit match_count;
end;
$$;
