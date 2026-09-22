# Estado de plataforma — Hacienda Conecta

Corte técnico: 21 de septiembre de 2026.

## Despliegue visible

Frontend público de revisión:

- GitHub Pages: `https://adminterritorial-bit.github.io/HACIENDA_CONECTA/`
- Fuente: rama `main`
- Build: `npm run build`
- Validación previa al despliegue: TypeScript, pruebas, build de producción y auditoría de dependencias.

La interfaz actual corresponde al rediseño institucional V3: navegación municipal, dashboard tributario, Registro Tributario guiado, calculadoras ICA/RETEICA, declaraciones, pagos, identidad/firma, certificados, Predial, acuerdos de pago, devoluciones, fiscalización, catálogo de rentas, normativa y consola interna por rol.

## Supabase

Proyecto activo: `jppykxqsxayzypzdbnqd`.

Migraciones aplicadas en el entorno conectado:

1. `001_hacienda_core`
2. `002_tax_registry_storage`
3. `003_tax_rules_modules_rpcs`
4. `004_security_hardening_roles_indexes`
5. `005_transactional_registration_signing_requests`
6. `006_certificate_issuance_staff_audit`
7. `007_invoker_hardening_and_indexes`
8. `008_rls_policy_consolidation_state_machine`
9. `009_phone_mfa_required_for_registry_sign_and_payment`
10. `010_integration_readiness_registry`\n11. `011_hacienda_operational_hardening_20260921`\n12. `012_hacienda_audited_citizen_requests_20260921`\n13. `013_hacienda_least_privilege_cleanup_20260921`

Estado verificado:

- RLS habilitado en tablas de negocio.
- Security Advisor de Supabase: **sin hallazgos activos** después del hardening.
- Storage privado `hacienda-documents`.
- 324 tarifas ICA cargadas.
- Catálogo de rentas municipales cargado.
- UVT 2026: COP 52.374.
- Cálculos ICA y RETEICA operativos en RPC PostgreSQL.
- Registro Tributario bloqueado hasta disponer de factor MFA de teléfono verificado.
- Firma y solicitud de pago exigen sesión AAL2 y validación OTP reciente.
- Edge Function `hc-verify-certificate` activa para validación pública de certificados.
- Máquina de estados de declaraciones protegida mediante trigger.
- Estado de integraciones externas registrado en `public.system_integrations`.

Las alertas de rendimiento restantes son informativas por índices todavía sin uso estadístico debido a la baja carga transaccional inicial; no constituyen hallazgos de seguridad.

## Flujo de identidad diseñado

1. Primer factor: Google OAuth o correo/contraseña.
2. Enrolamiento de número celular como Phone MFA.
3. Código SMS para verificar el número.
4. Registro Tributario.
5. Declaración.
6. Código SMS nuevo para autorizar firma.
7. Documento congelado + SHA-256 + evidencia AAL2.
8. Código SMS nuevo para autorización de pago.
9. Pasarela de recaudo.
10. Confirmación server-to-server / webhook.
11. Radicación y certificado verificable.

## Integraciones que requieren credenciales externas

### Google OAuth

El código del aplicativo ya usa `signInWithOAuth({ provider: "google" })`, pero el proveedor alojado de Supabase necesita credenciales emitidas por Google Cloud:

- Client ID.
- Client Secret.
- Callback de Supabase: `https://jppykxqsxayzypzdbnqd.supabase.co/auth/v1/callback`.
- URL del aplicativo: `https://adminterritorial-bit.github.io/HACIENDA_CONECTA/`.

El Client Secret debe almacenarse únicamente en la configuración segura del proveedor de Supabase/Google y rotarse si se expone. Nunca debe versionarse ni llegar al navegador.

### SMS / Phone MFA

La aplicación ya implementa `enroll → challenge → verify` y la base exige Phone MFA para Registro, firma y pago. La entrega real del SMS requiere un proveedor de mensajería configurado en Supabase Auth y habilitar Phone MFA en la configuración alojada del proyecto.

No existe una credencial de SMS embebida en el repositorio y no debe existir.

### Pasarela de pagos

La plataforma ya genera solicitudes/referencias y exige autorización por MFA. Para recaudo monetario real siguen siendo necesarios:

- convenio de recaudo del Municipio;
- credenciales del proveedor;
- firma/verificación de webhook;
- conciliación server-to-server.

El frontend nunca puede declarar por sí solo un pago como confirmado.

### Predial

La estructura de cuentas prediales y paz y salvo está creada, pero la aplicación no inventa predios, avalúos ni saldos. Debe conectarse la fuente maestra municipal/catastral.

## Bloqueos normativos pendientes

- calendario tributario oficial 2026;
- definición formal de periodicidad RETEICA 2026 ante la diferencia encontrada en las fuentes;
- reglas vigentes de cartera para cálculo oficial de acuerdos de pago;
- consolidación artículo por artículo de las modificaciones municipales aún pendientes de validación.
