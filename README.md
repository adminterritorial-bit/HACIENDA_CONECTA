# Hacienda Conecta — San Pedro, Valle del Cauca

MVP técnico para digitalizar de forma segura los trámites de la Secretaría de Hacienda: declaraciones, liquidaciones, pagos, firma electrónica con autenticación reforzada, radicación, certificados y trazabilidad.

## Estado

**Rama de desarrollo:** feature/hacienda-conecta-mvp

**No apto todavía para producción.** El repositorio aplica un enfoque fail-closed: si faltan parámetros críticos de la vigencia o proveedores reales de identidad, SMS y pagos, el modo producción no inicia.

## Qué ya incluye

- Motor de cálculo ICA por actividad CIIU y tarifa por mil.
- Motor RETEICA con bases mínimas configurables en UVT.
- Catálogo inicial de tarifas extraído de la documentación municipal suministrada.
- Regla de impuesto mínimo ICA y Avisos y Tableros separada para evitar doble cobro sobre el mínimo.
- Flujo transaccional con estados y bloqueos: borrador → identidad verificada → listo para firma → firmado → pago → radicación → certificado.
- Reto OTP ligado al usuario y al hash SHA-256 del documento.
- Hash/HMAC encadenado para eventos de auditoría.
- Abstracción de pasarela de pago: el redirect del navegador no constituye confirmación de pago.
- API con validación Zod, rate limiting, cabeceras de seguridad y redacción de secretos/PII en logs.
- Esquema PostgreSQL/Supabase con Row Level Security como base.
- Interfaz web accesible inicial y simulador ICA.
- Pruebas unitarias de reglas tributarias y workflow.
- CI con typecheck, pruebas y auditoría de dependencias.
- Documentación jurídica, de seguridad y decisiones bloqueantes.

## Fuentes suministradas usadas

- Acuerdo Municipal 013 de 2021 — Estatuto Tributario de San Pedro.
- Códigos y tarifas según actividad de comercio.
- Formulario de Declaración de Industria y Comercio.
- Formulario de Declaración Bimestral RETEICA.

Las hojas de cálculo se tomaron como **estructura de formulario**, no como fuente de fórmulas, porque no contienen un motor de cálculo completo.

## Principio esencial del motor tributario

Toda regla debe ser versionada por vigencia y asociada a:
- norma y artículo;
- fecha de vigencia;
- estado de validación;
- responsable de aprobación;
- parámetros;
- pruebas de regresión.

El software no debe decidir por inferencia conflictos normativos. Por ejemplo, la documentación suministrada presenta una diferencia respecto de la periodicidad RETEICA; el sistema la deja como decisión formal pendiente.

## Arquitectura propuesta

- Frontend web accesible.
- API TypeScript/Fastify.
- PostgreSQL/Supabase con RLS.
- IdP desacoplado para autenticación ciudadana y de funcionarios.
- Proveedor SMS desacoplado.
- Pasarela de pagos desacoplada con webhook y verificación server-to-server.
- Generador documental/certificados en fase siguiente.
- Almacenamiento de documentos con hash, versionado y política de retención.
- Auditoría append-only y monitoreo central.

## Flujo de declaración

1. Registro e identificación del contribuyente.
2. Validación de perfil y obligación tributaria.
3. Diligenciamiento asistido.
4. Cálculo con regla legal versionada.
5. Validaciones de consistencia.
6. Congelación del documento y hash.
7. Autenticación reforzada y firma.
8. Creación del pago si existe saldo.
9. Confirmación server-to-server del pago.
10. Radicación.
11. Generación de recibo/certificado y código de verificación.
12. Expediente y trazabilidad.

## Ejecución local

1. Copiar .env.example a .env.
2. Configurar UVT_VALUE_COP para probar RETEICA.
3. npm install
4. npm run typecheck
5. npm test
6. npm run dev
7. Abrir http://localhost:3000

## Seguridad

Consulte docs/SECURITY_BASELINE.md. No almacenar información de tarjetas. No exponer credenciales de servicio al frontend. No usar preguntas de seguridad como mecanismo principal de recuperación o firma.

## Antes de producción

Revisar docs/OPEN_DECISIONS.md. Entre los bloqueantes están:
- texto tributario consolidado y vigente;
- periodicidad RETEICA;
- UVT y calendario de la vigencia;
- pasarela y conciliación;
- proveedor de identidad y SMS;
- reglamentación/evidencia de firma;
- expedientes electrónicos y retención;
- integraciones predial/catastro.

## Alcance siguiente

La siguiente fase debe implementar autenticación real, persistencia, administración de reglas, formularios ICA/RETEICA completos, generación PDF, certificados verificables, webhooks de pago, conciliación, expediente electrónico, predial, acuerdos de pago, devoluciones y panel de funcionarios.
