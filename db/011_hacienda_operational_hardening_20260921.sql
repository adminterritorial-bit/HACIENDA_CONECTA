create index if not exists hc_audit_cases_taxpayer_user_idx
  on public.hc_audit_cases (taxpayer_user_id);

create index if not exists hc_certificate_requests_certificate_idx
  on public.hc_certificate_requests (certificate_id)
  where certificate_id is not null;
create index if not exists hc_certificate_requests_declaration_idx
  on public.hc_certificate_requests (declaration_id)
  where declaration_id is not null;
create index if not exists hc_certificate_requests_user_idx
  on public.hc_certificate_requests (user_id);

create index if not exists hc_establishments_registration_idx
  on public.hc_establishments (registration_id);

create index if not exists hc_payment_agreements_user_idx
  on public.hc_payment_agreements (user_id);

create index if not exists hc_payment_requests_declaration_idx
  on public.hc_payment_requests (declaration_id);

create index if not exists hc_payments_declaration_idx
  on public.hc_payments (declaration_id);

create index if not exists hc_paz_y_salvo_certificate_idx
  on public.hc_paz_y_salvo_requests (certificate_id)
  where certificate_id is not null;
create index if not exists hc_paz_y_salvo_property_idx
  on public.hc_paz_y_salvo_requests (property_account_id);
create index if not exists hc_paz_y_salvo_user_idx
  on public.hc_paz_y_salvo_requests (user_id);

create index if not exists hc_property_accounts_user_idx
  on public.hc_property_accounts (user_id);

create index if not exists hc_refund_requests_user_idx
  on public.hc_refund_requests (user_id);

create index if not exists hc_signature_evidence_signer_idx
  on public.hc_signature_evidence (signer_user_id);

create index if not exists hc_taxpayer_relationships_registration_idx
  on public.hc_taxpayer_relationships (registration_id);
create index if not exists hc_taxpayer_relationships_related_user_idx
  on public.hc_taxpayer_relationships (related_user_id)
  where related_user_id is not null;

drop policy if exists hc_est_write on public.hc_establishments;

create policy hc_est_insert
on public.hc_establishments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.hc_taxpayer_registrations r
    where r.id = hc_establishments.registration_id
      and r.user_id = (select auth.uid())
      and r.status = 'PENDING'
  )
);

create policy hc_est_update
on public.hc_establishments
for update
to authenticated
using (
  exists (
    select 1
    from public.hc_taxpayer_registrations r
    where r.id = hc_establishments.registration_id
      and r.user_id = (select auth.uid())
      and r.status = 'PENDING'
  )
)
with check (
  exists (
    select 1
    from public.hc_taxpayer_registrations r
    where r.id = hc_establishments.registration_id
      and r.user_id = (select auth.uid())
      and r.status = 'PENDING'
  )
);

create policy hc_est_delete
on public.hc_establishments
for delete
to authenticated
using (
  exists (
    select 1
    from public.hc_taxpayer_registrations r
    where r.id = hc_establishments.registration_id
      and r.user_id = (select auth.uid())
      and r.status = 'PENDING'
  )
);
