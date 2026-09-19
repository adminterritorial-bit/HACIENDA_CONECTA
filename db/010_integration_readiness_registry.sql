-- Migration 010: registro operativo de integraciones externas.

create table if not exists public.system_integrations (
  code text primary key,
  display_name text not null,
  provider text,
  status text not null check (status in ('ACTIVE','READY','REQUIRES_EXTERNAL_CREDENTIALS','BLOCKED','DISABLED')),
  notes text,
  last_checked_at timestamptz not null default now()
);

alter table public.system_integrations enable row level security;

drop policy if exists integrations_staff_read on public.system_integrations;
create policy integrations_staff_read on public.system_integrations
for select to authenticated
using (private.current_app_role() in ('hacienda_reviewer','hacienda_admin','auditor'));

insert into public.system_integrations(code,display_name,provider,status,notes) values
('SUPABASE_DB','Base de datos y RLS','Supabase','ACTIVE','Esquema tributario, RLS, MFA gates y Edge Functions desplegados.'),
('GOOGLE_OAUTH','Ingreso con Google','Google OAuth / Supabase Auth','REQUIRES_EXTERNAL_CREDENTIALS','Requiere Client ID y Client Secret creados en Google Cloud y activación del proveedor en Auth.'),
('PHONE_SMS','SMS para firma y pagos','Supabase Phone MFA','REQUIRES_EXTERNAL_CREDENTIALS','Requiere proveedor SMS habilitado y Phone MFA activado en Auth.'),
('PAYMENT_GATEWAY','Pasarela PSE / tarjetas','Proveedor de recaudo municipal','REQUIRES_EXTERNAL_CREDENTIALS','Requiere convenio y credenciales del proveedor para webhooks y conciliación.'),
('CERT_VERIFY','Verificación pública de certificados','Supabase Edge Functions','ACTIVE','Edge Function verify-certificate desplegada.')
on conflict (code) do update set
  display_name=excluded.display_name,
  provider=excluded.provider,
  status=excluded.status,
  notes=excluded.notes,
  last_checked_at=now();
