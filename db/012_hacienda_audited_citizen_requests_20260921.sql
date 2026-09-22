create policy hc_audit_rpc_insert
on public.hc_audit_events
for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and current_setting('hc.write_path', true) = 'rpc'
);

drop trigger if exists hc_certificate_request_guard on public.hc_certificate_requests;
create trigger hc_certificate_request_guard
before insert or update or delete on public.hc_certificate_requests
for each row execute function private.hc_guard_rpc_write();

drop trigger if exists hc_paz_y_salvo_guard on public.hc_paz_y_salvo_requests;
create trigger hc_paz_y_salvo_guard
before insert or update or delete on public.hc_paz_y_salvo_requests
for each row execute function private.hc_guard_rpc_write();

drop trigger if exists hc_payment_agreement_guard on public.hc_payment_agreements;
create trigger hc_payment_agreement_guard
before insert or update or delete on public.hc_payment_agreements
for each row execute function private.hc_guard_rpc_write();

drop trigger if exists hc_refund_request_guard on public.hc_refund_requests;
create trigger hc_refund_request_guard
before insert or update or delete on public.hc_refund_requests
for each row execute function private.hc_guard_rpc_write();

create or replace function public.hc_submit_certificate_request(
  p_certificate_type text,
  p_declaration_id uuid default null
)
returns uuid
language plpgsql
set search_path to 'public','private'
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_type text := upper(trim(coalesce(p_certificate_type,'')));
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;
  if v_type not in ('DECLARACION_PRESENTADA','PAZ_Y_SALVO','CERTIFICADO_RETENCION') then
    raise exception 'Tipo de certificado no habilitado';
  end if;
  if p_declaration_id is not null and not exists (
    select 1 from public.hc_declarations
    where id=p_declaration_id and taxpayer_user_id=v_uid
  ) then
    raise exception 'La declaración relacionada no pertenece al usuario';
  end if;

  select id into v_id
  from public.hc_certificate_requests
  where user_id=v_uid
    and certificate_type=v_type
    and declaration_id is not distinct from p_declaration_id
    and status in ('SUBMITTED','IN_REVIEW')
  order by submitted_at desc
  limit 1;
  if v_id is not null then return v_id; end if;

  perform set_config('hc.write_path','rpc',true);
  insert into public.hc_certificate_requests(user_id,declaration_id,certificate_type,status)
  values(v_uid,p_declaration_id,v_type,'SUBMITTED')
  returning id into v_id;

  insert into public.hc_audit_events(actor_id,action,resource_type,resource_id,metadata)
  values(v_uid,'CERTIFICATE_REQUEST_SUBMITTED','certificate_request',v_id::text,
    jsonb_build_object('certificateType',v_type,'declarationId',p_declaration_id));
  return v_id;
end
$function$;

create or replace function public.hc_submit_paz_y_salvo(
  p_property_account_id uuid,
  p_request_type text default 'PREDIAL'
)
returns uuid
language plpgsql
set search_path to 'public','private'
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_type text := upper(trim(coalesce(p_request_type,'PREDIAL')));
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;
  if v_type <> 'PREDIAL' then raise exception 'Tipo de paz y salvo no habilitado'; end if;
  if not exists (
    select 1 from public.hc_property_accounts
    where id=p_property_account_id and user_id=v_uid
  ) then
    raise exception 'La cuenta predial no pertenece al usuario';
  end if;

  select id into v_id
  from public.hc_paz_y_salvo_requests
  where user_id=v_uid and property_account_id=p_property_account_id
    and request_type=v_type and status in ('SUBMITTED','IN_REVIEW')
  order by submitted_at desc limit 1;
  if v_id is not null then return v_id; end if;

  perform set_config('hc.write_path','rpc',true);
  insert into public.hc_paz_y_salvo_requests(user_id,property_account_id,request_type,status)
  values(v_uid,p_property_account_id,v_type,'SUBMITTED')
  returning id into v_id;

  insert into public.hc_audit_events(actor_id,action,resource_type,resource_id,metadata)
  values(v_uid,'PAZ_Y_SALVO_REQUEST_SUBMITTED','paz_y_salvo_request',v_id::text,
    jsonb_build_object('propertyAccountId',p_property_account_id,'requestType',v_type));
  return v_id;
end
$function$;

create or replace function public.hc_submit_payment_agreement(
  p_debt_type text,
  p_principal_cop bigint,
  p_requested_installments integer
)
returns uuid
language plpgsql
set search_path to 'public','private'
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_debt text := upper(trim(coalesce(p_debt_type,'')));
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;
  if v_debt not in ('PREDIAL','ICA','RETEICA','OTRA_RENTA') then
    raise exception 'Tipo de deuda no habilitado';
  end if;
  if p_principal_cop is null or p_principal_cop <= 0 then raise exception 'Capital inválido'; end if;
  if p_requested_installments is null or p_requested_installments < 1 or p_requested_installments > 120 then
    raise exception 'Número de cuotas inválido';
  end if;

  select id into v_id
  from public.hc_payment_agreements
  where user_id=v_uid and debt_type=v_debt and principal_cop=p_principal_cop
    and requested_installments=p_requested_installments and status='SUBMITTED'
  order by created_at desc limit 1;
  if v_id is not null then return v_id; end if;

  perform set_config('hc.write_path','rpc',true);
  insert into public.hc_payment_agreements(
    user_id,debt_type,principal_cop,interest_cop,requested_installments,status
  ) values(v_uid,v_debt,p_principal_cop,0,p_requested_installments,'SUBMITTED')
  returning id into v_id;

  insert into public.hc_audit_events(actor_id,action,resource_type,resource_id,metadata)
  values(v_uid,'PAYMENT_AGREEMENT_SUBMITTED','payment_agreement',v_id::text,
    jsonb_build_object('debtType',v_debt,'principalCop',p_principal_cop,'requestedInstallments',p_requested_installments));
  return v_id;
end
$function$;

create or replace function public.hc_submit_refund_request(
  p_tax_type text,
  p_tax_year integer,
  p_amount_cop bigint,
  p_reason text
)
returns uuid
language plpgsql
set search_path to 'public','private'
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_tax text := upper(trim(coalesce(p_tax_type,'')));
  v_reason text := trim(coalesce(p_reason,''));
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;
  if v_tax not in ('ICA','RETEICA','PREDIAL','OTRO') then raise exception 'Tributo no habilitado'; end if;
  if p_tax_year is null or p_tax_year < 2000 or p_tax_year > extract(year from current_date)::integer + 1 then
    raise exception 'Vigencia inválida';
  end if;
  if p_amount_cop is null or p_amount_cop <= 0 then raise exception 'Valor solicitado inválido'; end if;
  if char_length(v_reason) < 20 or char_length(v_reason) > 4000 then
    raise exception 'El fundamento debe tener entre 20 y 4000 caracteres';
  end if;

  select id into v_id
  from public.hc_refund_requests
  where user_id=v_uid and tax_type=v_tax and tax_year=p_tax_year and amount_cop=p_amount_cop
    and reason=v_reason and status='SUBMITTED'
  order by created_at desc limit 1;
  if v_id is not null then return v_id; end if;

  perform set_config('hc.write_path','rpc',true);
  insert into public.hc_refund_requests(
    user_id,tax_type,tax_year,amount_cop,reason,status,submitted_at
  ) values(v_uid,v_tax,p_tax_year,p_amount_cop,v_reason,'SUBMITTED',now())
  returning id into v_id;

  insert into public.hc_audit_events(actor_id,action,resource_type,resource_id,metadata)
  values(v_uid,'REFUND_REQUEST_SUBMITTED','refund_request',v_id::text,
    jsonb_build_object('taxType',v_tax,'taxYear',p_tax_year,'amountCop',p_amount_cop));
  return v_id;
end
$function$;

revoke all on function public.hc_submit_certificate_request(text,uuid) from public, anon;
revoke all on function public.hc_submit_paz_y_salvo(uuid,text) from public, anon;
revoke all on function public.hc_submit_payment_agreement(text,bigint,integer) from public, anon;
revoke all on function public.hc_submit_refund_request(text,integer,bigint,text) from public, anon;

grant execute on function public.hc_submit_certificate_request(text,uuid) to authenticated;
grant execute on function public.hc_submit_paz_y_salvo(uuid,text) to authenticated;
grant execute on function public.hc_submit_payment_agreement(text,bigint,integer) to authenticated;
grant execute on function public.hc_submit_refund_request(text,integer,bigint,text) to authenticated;
