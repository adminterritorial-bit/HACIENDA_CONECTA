-- Hacienda Conecta - esquema base PostgreSQL/Supabase.
-- Revisar roles, retención y controles antes de producción.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.app_role as enum (
  'citizen',
  'accountant',
  'hacienda_reviewer',
  'hacienda_admin',
  'auditor'
);

create type public.declaration_status as enum (
  'DRAFT',
  'IDENTITY_VERIFIED',
  'READY_TO_SIGN',
  'SIGNED',
  'PAYMENT_PENDING',
  'PAID',
  'FILED',
  'CERTIFICATE_AVAILABLE',
  'REJECTED',
  'CANCELLED'
);

create table if not exists public.profiles (
  user_id uuid primary key,
  document_type text not null,
  document_number_hash text not null,
  full_name text not null,
  email text not null,
  phone_e164 text not null,
  role public.app_role not null default 'citizen',
  identity_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_number_hash)
);

create table if not exists public.tax_rule_versions (
  id uuid primary key default gen_random_uuid(),
  tax_type text not null,
  valid_from date not null,
  valid_to date,
  legal_reference text not null,
  rules jsonb not null,
  status text not null check (status in ('DRAFT','VALIDATED','RETIRED')),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  exclude using gist (
    tax_type with =,
    daterange(valid_from, coalesce(valid_to, 'infinity'::date), '[]') with &&
  ) where (status = 'VALIDATED')
);

create table if not exists public.declarations (
  id uuid primary key default gen_random_uuid(),
  taxpayer_user_id uuid not null references public.profiles(user_id),
  tax_type text not null check (tax_type in ('ICA','RETEICA','PREDIAL','PUBLICIDAD','DELINEACION','OTRO')),
  tax_year integer not null check (tax_year >= 2021),
  period text not null,
  status public.declaration_status not null default 'DRAFT',
  rule_version_id uuid references public.tax_rule_versions(id),
  payload jsonb not null default '{}'::jsonb,
  calculation jsonb,
  balance_due_cop bigint not null default 0 check (balance_due_cop >= 0),
  document_sha256 text,
  filed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signature_evidence (
  id uuid primary key default gen_random_uuid(),
  declaration_id uuid not null references public.declarations(id),
  signer_user_id uuid not null references public.profiles(user_id),
  document_sha256 text not null,
  auth_method text not null,
  otp_challenge_id text,
  signed_at timestamptz not null,
  ip_hash text,
  user_agent_hash text,
  evidence jsonb not null default '{}'::jsonb,
  unique(declaration_id, signer_user_id, document_sha256)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  declaration_id uuid not null references public.declarations(id),
  provider text not null,
  provider_payment_id text not null,
  reference text not null unique,
  amount_cop bigint not null check (amount_cop >= 0),
  status text not null check (status in ('CREATED','PENDING','APPROVED','DECLINED','VOIDED','REFUNDED')),
  provider_payload_hash text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, provider_payment_id)
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  declaration_id uuid not null references public.declarations(id),
  type text not null,
  serial text not null unique,
  document_sha256 text not null,
  verification_token_hash text not null unique,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null unique
);

create index if not exists declarations_taxpayer_idx on public.declarations(taxpayer_user_id, created_at desc);
create index if not exists payments_declaration_idx on public.payments(declaration_id);
create index if not exists audit_resource_idx on public.audit_events(resource_type, resource_id, occurred_at);

alter table public.profiles enable row level security;
alter table public.declarations enable row level security;
alter table public.signature_evidence enable row level security;
alter table public.payments enable row level security;
alter table public.certificates enable row level security;
alter table public.audit_events enable row level security;

-- Estas políticas asumen Supabase Auth. Si se usa otro IdP se debe adaptar la función de identidad.
create policy profiles_self_select on public.profiles
for select using (user_id = auth.uid());

create policy profiles_self_update on public.profiles
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy declarations_owner_select on public.declarations
for select using (taxpayer_user_id = auth.uid());

create policy declarations_owner_insert on public.declarations
for insert with check (taxpayer_user_id = auth.uid());

create policy declarations_owner_update_draft on public.declarations
for update using (
  taxpayer_user_id = auth.uid()
  and status in ('DRAFT','IDENTITY_VERIFIED','READY_TO_SIGN')
)
with check (taxpayer_user_id = auth.uid());

create policy signature_owner_select on public.signature_evidence
for select using (signer_user_id = auth.uid());

create policy payment_owner_select on public.payments
for select using (
  exists (
    select 1 from public.declarations d
    where d.id = payments.declaration_id
      and d.taxpayer_user_id = auth.uid()
  )
);

create policy certificates_owner_select on public.certificates
for select using (
  exists (
    select 1 from public.declarations d
    where d.id = certificates.declaration_id
      and d.taxpayer_user_id = auth.uid()
  )
);

-- No se crea política ciudadana para audit_events: RLS lo niega por defecto.
-- Operaciones privilegiadas deben ejecutarse desde backend, nunca con service_role en navegador.
