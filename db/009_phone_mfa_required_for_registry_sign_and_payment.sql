-- Migration 009: Phone MFA obligatorio para Registro Tributario, firma y autorización de pago.

create or replace function private.current_verified_phone()
returns text
language sql
stable
security definer
set search_path = auth, public
as $$
  select phone
  from auth.mfa_factors
  where user_id = (select auth.uid())
    and factor_type::text = 'phone'
    and status::text = 'verified'
  order by updated_at desc
  limit 1
$$;

revoke all on function private.current_verified_phone() from public, anon;
grant execute on function private.current_verified_phone() to authenticated;

create or replace function private.has_recent_phone_mfa(max_age_seconds integer default 300)
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select
    (select auth.uid()) is not null
    and coalesce((select auth.jwt()->>'aal'),'aal1') = 'aal2'
    and exists (
      select 1
      from auth.mfa_factors f
      where f.user_id = (select auth.uid())
        and f.factor_type::text = 'phone'
        and f.status::text = 'verified'
    )
    and exists (
      select 1
      from jsonb_array_elements(coalesce((select auth.jwt()->'amr'),'[]'::jsonb)) amr
      where amr->>'method' = 'otp'
        and coalesce((amr->>'timestamp')::bigint,0) >= extract(epoch from now())::bigint - greatest(max_age_seconds,60)
    )
$$;

revoke all on function private.has_recent_phone_mfa(integer) from public, anon;
grant execute on function private.has_recent_phone_mfa(integer) to authenticated;

create or replace function public.register_taxpayer(p_data jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_uid uuid := auth.uid();
  v_registration_id uuid;
  v_hash text;
  v_activity jsonb;
  v_relationship jsonb;
  v_primary_count int;
  v_phone text;
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;

  v_phone := private.current_verified_phone();
  if v_phone is null then
    raise exception 'Debes verificar tu número de teléfono por SMS antes de completar el Registro Tributario';
  end if;

  if coalesce(p_data->>'dataPolicyAccepted','false') <> 'true' then
    raise exception 'Debe aceptar la política de tratamiento de datos';
  end if;
  if coalesce(p_data->>'documentNumber','') = '' then raise exception 'Documento requerido'; end if;
  if coalesce(p_data->>'documentType','') = '' then raise exception 'Tipo de documento requerido'; end if;
  if coalesce(p_data->>'fullNameOrBusinessName','') = '' then raise exception 'Nombre o razón social requerido'; end if;
  if jsonb_typeof(p_data->'economicActivities') <> 'array' or jsonb_array_length(p_data->'economicActivities')=0 then
    raise exception 'Debe registrar actividades económicas';
  end if;

  select count(*) into v_primary_count
  from jsonb_array_elements(p_data->'economicActivities') x
  where coalesce((x->>'primary')::boolean,false);

  if v_primary_count <> 1 then
    raise exception 'Debe existir exactamente una actividad principal';
  end if;

  v_hash := encode(
    digest(upper(p_data->>'documentType') || ':' || upper(trim(p_data->>'documentNumber')), 'sha256'),
    'hex'
  );

  insert into public.profiles(user_id,document_type,document_number_hash,full_name,email,phone_e164,role,identity_verified_at)
  values(
    v_uid,
    upper(p_data->>'documentType'),
    v_hash,
    trim(p_data->>'fullNameOrBusinessName'),
    lower(coalesce(p_data->>'email',auth.jwt()->>'email','')),
    v_phone,
    'citizen',
    now()
  )
  on conflict (user_id) do update set
    document_type=excluded.document_type,
    document_number_hash=excluded.document_number_hash,
    full_name=excluded.full_name,
    email=excluded.email,
    phone_e164=excluded.phone_e164,
    identity_verified_at=excluded.identity_verified_at,
    updated_at=now()
  where public.profiles.role='citizen';

  select id into v_registration_id
  from public.taxpayer_registrations
  where user_id=v_uid
  limit 1;

  if v_registration_id is null then
    insert into public.taxpayer_registrations(
      user_id,person_type,tax_identifier_hash,business_name,fiscal_address,municipality,department,
      data_policy_version,data_policy_accepted_at,status
    ) values (
      v_uid,p_data->>'personType',v_hash,trim(p_data->>'fullNameOrBusinessName'),
      trim(p_data->>'fiscalAddress'),coalesce(p_data->>'municipality','San Pedro'),
      coalesce(p_data->>'department','Valle del Cauca'),
      coalesce(p_data->>'dataPolicyVersion','2026-01'),now(),'PENDING'
    ) returning id into v_registration_id;
  else
    update public.taxpayer_registrations set
      person_type=p_data->>'personType',
      tax_identifier_hash=v_hash,
      business_name=trim(p_data->>'fullNameOrBusinessName'),
      fiscal_address=trim(p_data->>'fiscalAddress'),
      municipality=coalesce(p_data->>'municipality','San Pedro'),
      department=coalesce(p_data->>'department','Valle del Cauca'),
      data_policy_version=coalesce(p_data->>'dataPolicyVersion','2026-01'),
      data_policy_accepted_at=now(),
      updated_at=now()
    where id=v_registration_id and status='PENDING';
  end if;

  delete from public.taxpayer_activities where registration_id=v_registration_id;

  for v_activity in select * from jsonb_array_elements(p_data->'economicActivities')
  loop
    if not exists (
      select 1
      from public.ica_tariffs
      where ciiu=v_activity->>'ciiu'
        and status in ('BASE_VALIDATED','ACTIVE_VALIDATED')
    ) then
      raise exception 'CIIU % no se encuentra en el catálogo validado', v_activity->>'ciiu';
    end if;

    insert into public.taxpayer_activities(registration_id,ciiu,is_primary)
    values(v_registration_id,v_activity->>'ciiu',coalesce((v_activity->>'primary')::boolean,false));
  end loop;

  delete from public.taxpayer_relationships where registration_id=v_registration_id;

  if p_data ? 'representative' and jsonb_typeof(p_data->'representative')='object' then
    v_relationship := p_data->'representative';
    insert into public.taxpayer_relationships(
      registration_id,relation_type,related_name,related_document_hash,related_email
    ) values (
      v_registration_id,'LEGAL_REPRESENTATIVE',v_relationship->>'fullName',
      encode(
        digest(
          upper(coalesce(v_relationship->>'documentType','')) || ':' ||
          upper(trim(coalesce(v_relationship->>'documentNumber',''))),
          'sha256'
        ),
        'hex'
      ),
      lower(v_relationship->>'email')
    );
  end if;

  if p_data ? 'accountant' and jsonb_typeof(p_data->'accountant')='object' then
    v_relationship := p_data->'accountant';
    insert into public.taxpayer_relationships(
      registration_id,relation_type,related_name,related_document_hash,professional_card
    ) values (
      v_registration_id,'ACCOUNTANT',v_relationship->>'fullName',
      encode(digest('ID:' || upper(trim(coalesce(v_relationship->>'documentNumber',''))), 'sha256'),'hex'),
      v_relationship->>'professionalCard'
    );
  end if;

  return v_registration_id;
end $$;

create or replace function private.validate_declaration_transition()
returns trigger
language plpgsql
security definer
set search_path=public, private
as $$
begin
  if new.status = old.status then return new; end if;
  if old.status='DRAFT' and new.status in ('IDENTITY_VERIFIED','READY_TO_SIGN','CANCELLED') then return new; end if;
  if old.status='IDENTITY_VERIFIED' and new.status in ('READY_TO_SIGN','CANCELLED') then return new; end if;

  if old.status='READY_TO_SIGN' and new.status in ('PAYMENT_PENDING','FILED','CANCELLED') then
    if new.status <> 'CANCELLED' and not private.has_recent_phone_mfa(300) then
      raise exception 'La firma requiere un código SMS reciente enviado al teléfono verificado';
    end if;
    return new;
  end if;

  if old.status='PAYMENT_PENDING' and new.status in ('PAID','CANCELLED') then return new; end if;
  if old.status='PAID' and new.status='FILED' then return new; end if;
  if old.status='FILED' and new.status='CERTIFICATE_AVAILABLE' then return new; end if;

  raise exception 'Transición de declaración no permitida: % -> %', old.status, new.status;
end $$;

create or replace function public.request_payment(p_declaration_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=public, private
as $$
declare
  v_uid uuid := auth.uid();
  v_amount bigint;
  v_id uuid;
  v_ref text;
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;

  if not private.has_recent_phone_mfa(300) then
    raise exception 'Para iniciar el pago debes validar un código SMS reciente enviado a tu teléfono';
  end if;

  select balance_due_cop into v_amount
  from declarations
  where id=p_declaration_id
    and taxpayer_user_id=v_uid
    and status='PAYMENT_PENDING';

  if v_amount is null then
    raise exception 'Declaración no disponible para pago';
  end if;

  v_ref := 'HC-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' ||
           upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));

  insert into payment_requests(user_id,declaration_id,amount_cop,reference,status)
  values(v_uid,p_declaration_id,v_amount,v_ref,'PENDING_PROVIDER')
  returning id into v_id;

  return v_id;
end $$;
