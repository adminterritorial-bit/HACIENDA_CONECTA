create or replace function public.ensure_launch_profile()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text;
  v_admin record;
  v_status text;
begin
  if auth.uid() is null then return; end if;

  select email into v_email
  from auth.users
  where id = auth.uid();

  if v_email is null then return; end if;

  -- Mesa de Ayuda es institucional. Hacienda Conecta comparte auth.users,
  -- pero las identidades ciudadanas no deben poblar public.profiles de Mesa.
  if lower(trim(v_email)) !~ '^[^@[:space:]]+@sanpedro-valle[.]gov[.]co$' then
    return;
  end if;

  insert into public.profiles(id,email,full_name,status)
  values(auth.uid(), lower(v_email), coalesce(split_part(v_email,'@',1), v_email), 'pending')
  on conflict(id) do nothing;

  select status into v_status
  from public.profiles
  where id = auth.uid();

  select * into v_admin
  from public.launch_admin_emails
  where email = lower(v_email);

  if not found then return; end if;

  if v_status = 'pending' then
    update public.profiles
    set status='active', updated_at=now()
    where id=auth.uid();

    v_status := 'active';
  end if;

  if v_status <> 'active' then
    return;
  end if;

  insert into public.profile_roles(profile_id,role_code)
  values(auth.uid(),v_admin.role_code)
  on conflict do nothing;

  if v_admin.team_code is not null then
    insert into public.profile_teams(profile_id,team_code)
    values(auth.uid(),v_admin.team_code)
    on conflict do nothing;

    update public.schedule_resources
    set profile_id=auth.uid(), updated_at=now()
    where code='admin_tic'
      and v_admin.team_code='TIC';
  end if;
end;
$function$;

comment on function public.ensure_launch_profile()
is 'Bootstrap exclusivo de Mesa de Ayuda para identidades institucionales @sanpedro-valle.gov.co; evita contaminación cruzada con Hacienda Conecta.';
