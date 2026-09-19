# Línea base de seguridad

Este sistema administra identidad, información tributaria reservada, documentos, pagos y evidencia de firma. Ningún software puede declararse inhackeable. El objetivo es un diseño de alto aseguramiento, con defensa en profundidad, mínimo privilegio, trazabilidad y capacidad de respuesta.

## Controles obligatorios antes de producción

### Identidad y acceso
- IdP central y MFA resistente a phishing para funcionarios; WebAuthn/passkeys preferente.
- OTP SMS puede ser un factor adicional para ciudadanía, pero no debe ser el único factor de funcionarios privilegiados.
- Autenticación reforzada para firmar, cambiar teléfono/correo, aprobar devoluciones, acuerdos, reglas tributarias y certificados.
- RBAC más ABAC y segregación de funciones.
- RLS sobre contribuyentes, declaraciones, pagos y certificados.
- Sesiones cortas, rotación y revocación de tokens.

### Firma y evidencia
- Congelar el documento antes del reto.
- Calcular SHA-256 del documento.
- Reto de un solo uso, expiración y límite de intentos.
- Vincular reto a usuario, hash del documento y operación.
- Conservar evidencia del método de autenticación y consentimiento.
- Usar sello de tiempo confiable si el diseño jurídico definitivo lo exige.
- La imagen de firma nunca sustituye por sí sola la evidencia de la transacción.

Las preguntas de seguridad no se usarán como factor principal: suelen basarse en datos adivinables o reutilizados. Si Hacienda decide conservarlas como control auxiliar, sus respuestas deben almacenarse con hash de contraseña robusto, nunca en texto plano, y no deben permitir recuperar una cuenta sin un factor adicional.

### Pagos
- Referencia única e idempotente.
- Nunca aceptar el retorno del navegador como prueba de pago.
- Verificación server-to-server con la pasarela.
- Validar firma de webhooks y evitar replay.
- Conciliar contra el archivo o extracto oficial de recaudo.
- No almacenar PAN ni CVV; usar checkout/tokenización del proveedor para reducir alcance PCI.
- Pagos aprobados son inmutables; reversos y devoluciones se registran como eventos.

### Aplicación e infraestructura
- TLS 1.2 o superior y HSTS.
- CSP, frame-ancestors, nosniff, Referrer-Policy y Permissions-Policy.
- WAF/CDN, rate limiting y protección anti-bot accesible.
- Validación estricta, consultas parametrizadas y almacenamiento seguro.
- Secret manager; cero secretos en repositorio.
- Cifrado en tránsito y reposo.
- Backups cifrados y restauración probada con RPO/RTO.
- SAST, dependency scanning, secret scanning, DAST y pentest independiente.
- Ambientes dev, test y prod separados.
- Branch protection, PR obligatorio, CI y revisión.
- Logs estructurados con redacción de PII y monitoreo/SIEM.
- Gestión de vulnerabilidades con SLA por criticidad.

### Auditoría
- Registro append-only de eventos críticos.
- Encadenamiento hash/HMAC o almacenamiento WORM.
- Registrar actor, acción, recurso, fecha/hora, resultado y correlación.
- Nunca registrar OTP, contraseña, token, CVV, imagen completa de documento o datos innecesarios.

### Privacidad
- Minimización, finalidad y necesidad.
- Política y aviso de tratamiento.
- Inventario y clasificación de datos.
- Retención y eliminación documentadas.
- Procedimiento de consultas/reclamos.
- Evaluación de impacto para integraciones de identidad y datos sensibles.
- Cláusulas de encargado y seguridad con proveedores.

### Accesibilidad y continuidad
- WCAG 2.1 AA como mínimo.
- Autenticación y anti-bot accesibles.
- Conservar borradores y estados consistentes si falla identidad, firma o pago externo.

## Gates de despliegue

No desplegar a producción si falla cualquiera de estos controles:
1. reglas tributarias de la vigencia no validadas;
2. pasarela sin verificación server-to-server/webhook firmado;
3. MFA de funcionarios no activo;
4. secretos o service role expuestos al frontend;
5. RLS ausente o pruebas de aislamiento fallidas;
6. restauración de backup no probada;
7. vulnerabilidad crítica/alta sin tratamiento;
8. política de privacidad, términos y retención no aprobados;
9. errores críticos de accesibilidad;
10. ausencia de plan de incidentes y responsables.
