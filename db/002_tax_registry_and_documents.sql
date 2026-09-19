-- Phase 1 extension: Registro Tributario + document evidence.

create table if not exists public.taxpayer_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id),
  person_type text not null check (person_type in ('NATURAL','JURIDICA')),
  tax_identifier_hash text not null unique,
  business_name text not null,
  fiscal_address text not null,
  municipality text not null,
  department text not null,
  data_policy_version text not null,
  data_policy_accepted_at timestamptz not null,
  status text not null default 'PENDING' check (status in ('PENDING','VERIFIED','SUSPENDED','CANCELLED')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.taxpayer_activities (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.taxpayer_registrations(id) on delete cascade,
  ciiu text not null check (ciiu ~ '^[0-9]{4}$'),
  is_primary boolean not null default false,
  valid_from date not null default current_date,
  valid_to date,
  unique(registration_id, ciiu, valid_from)
);

create unique index if not exists taxpayer_one_current_primary_activity
on public.taxpayer_activities(registration_id)
where is_primary = true and valid_to is null;

create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.taxpayer_registrations(id) on delete cascade,
  name text not null,
  address text not null,
  opened_at date,
  closed_at date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CLOSED','SUSPENDED')),
  created_at timestamptz not null default now()
);

create table if not exists public.taxpayer_relationships (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.taxpayer_registrations(id) on delete cascade,
  related_user_id uuid references public.profiles(user_id),
  relation_type text not null check (relation_type in ('LEGAL_REPRESENTATIVE','ACCOUNTANT','STATUTORY_AUDITOR','AUTHORIZED_AGENT')),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  evidence_sha256 text,
  created_at timestamptz not null default now()
);

create table if not exists public.document_artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(user_id),
  declaration_id uuid references public.declarations(id),
  artifact_type text not null,
  storage_key text not null unique,
  mime_type text not null,
  sha256 text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  retention_class text not null,
  created_at timestamptz not null default now()
);

alter table public.taxpayer_registrations enable row level security;
alter table public.taxpayer_activities enable row level security;
alter table public.establishments enable row level security;
alter table public.taxpayer_relationships enable row level security;
alter table public.document_artifacts enable row level security;

create policy taxpayer_registration_owner_select on public.taxpayer_registrations
for select using (user_id = auth.uid());

create policy taxpayer_registration_owner_insert on public.taxpayer_registrations
for insert with check (user_id = auth.uid());

create policy taxpayer_registration_owner_update_pending on public.taxpayer_registrations
for update using (user_id = auth.uid() and status = 'PENDING')
with check (user_id = auth.uid());

create policy taxpayer_activities_owner_select on public.taxpayer_activities
for select using (
  exists (
    select 1 from public.taxpayer_registrations r
    where r.id = taxpayer_activities.registration_id and r.user_id = auth.uid()
  )
);

create policy establishments_owner_select on public.establishments
for select using (
  exists (
    select 1 from public.taxpayer_registrations r
    where r.id = establishments.registration_id and r.user_id = auth.uid()
  )
);

create policy relationships_owner_select on public.taxpayer_relationships
for select using (
  exists (
    select 1 from public.taxpayer_registrations r
    where r.id = taxpayer_relationships.registration_id and r.user_id = auth.uid()
  )
);

create policy artifacts_owner_select on public.document_artifacts
for select using (owner_user_id = auth.uid());
