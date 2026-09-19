# Estado de plataforma — Hacienda Conecta

Corte técnico: 19 de septiembre de 2026.

## Supabase

Proyecto activo: `dvdpgllezrmttrknbcjq`.

Migraciones aplicadas en el entorno conectado:

1. `001_hacienda_core`
2. `002_tax_registry_storage`
3. `003_tax_rules_modules_rpcs`
4. `004_security_hardening_roles_indexes`
5. `005_transactional_registration_signing_requests`
6. `006_certificate_issuance_staff_audit`
7. `007_invoker_hardening_and_indexes`
8. `008_rls_policy_consolidation_state_machine`

Estado verificado:
- RLS habilitado en las tablas públicas de negocio.
- Asesor de seguridad Supabase: sin hallazgos activos después del hardening.
- Storage privado `hacienda-documents`.
- 324 tarifas ICA cargadas.
- 30 rentas/módulos catalogados.
- UVT 2026: COP 52.374.
- Cálculos ICA y RETEICA probados en base de datos.
- MFA AAL2 obligatorio para la transición de firma.
- Edge Function pública de verificación de certificados activa.
- Máquina de estados de declaraciones protegida también mediante trigger.

Las alertas de rendimiento restantes corresponden exclusivamente a índices que aún no han recibido uso estadístico porque el entorno transaccional se encuentra sin carga real. No deben eliminarse por ese motivo durante la fase inicial.

## Vercel

La rama principal contiene rutas explícitas de Vercel para:
- `/api/v1/health`
- `/api/v1/calculate/ica`
- `/api/v1/calculate/reteica`
- `/api/v1/catalog/ica/:ciiu`

El frontend de producción se genera con `npm run build` a `public/app.js`.

## Integraciones externas todavía no sustituibles por software

Para habilitar recaudo real se requieren credenciales y convenio del proveedor de pagos del Municipio. La aplicación no simula una confirmación bancaria.

Para SMS se requiere configurar un proveedor admitido en Supabase Auth. Mientras se realiza esa contratación/configuración, el segundo factor TOTP de Supabase puede utilizarse para firma con AAL2.

Predial requiere una fuente maestra municipal/catastral. Hacienda Conecta ya contiene el modelo y las políticas para recibir dicha integración, pero no inventa datos de predios o saldos.

RETEICA 2026 conserva un bloqueo normativo para la periodicidad hasta que se incorpore el acto/calendario vigente que resuelva formalmente la diferencia encontrada en la documentación base.
