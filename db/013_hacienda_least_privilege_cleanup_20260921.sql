drop policy if exists hc_audit_rpc_insert on public.hc_audit_events;
create policy hc_audit_rpc_insert
on public.hc_audit_events
for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and (select current_setting('hc.write_path', true)) = 'rpc'
);

revoke all on function private.hc_guard_rpc_write() from public, anon, authenticated;
revoke all on function private.hc_validate_declaration_transition() from public, anon, authenticated;

revoke execute on function public.hc_dashboard_summary() from anon;
revoke execute on function public.hc_registry_snapshot() from anon;
