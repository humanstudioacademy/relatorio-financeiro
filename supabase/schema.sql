-- Tabela de acessos capturados pelo link /relatorio_jul26.pdf
create table if not exists public.acessos (
  id  text primary key,
  ts  timestamptz not null default now(),
  js  boolean,
  hit jsonb not null
);

create index if not exists acessos_ts_idx on public.acessos (ts desc);

-- Segurança: com RLS ativo e SEM policies, apenas a service_role (nossa
-- SUPABASE_SECRET_KEY, usada só no servidor) consegue ler/gravar.
-- A chave publishable/anon NÃO tem acesso aos dados.
alter table public.acessos enable row level security;
