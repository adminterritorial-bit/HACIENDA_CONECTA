# Google OAuth — Hacienda Conecta

## Proyecto Supabase de producción
- Project ref: `jppykxqsxayzypzdbnqd`
- Project URL: `https://jppykxqsxayzypzdbnqd.supabase.co`
- Callback OAuth obligatorio en Google Cloud:
  `https://jppykxqsxayzypzdbnqd.supabase.co/auth/v1/callback`

> No usar callbacks de otros proyectos Supabase. Un callback con un project ref distinto provoca `Error 400: redirect_uri_mismatch`.

## Google Cloud Console
En el cliente OAuth 2.0 usado por Hacienda Conecta:

1. Tipo de aplicación: **Web application**.
2. En **Authorized redirect URIs**, registrar exactamente:
   - `https://jppykxqsxayzypzdbnqd.supabase.co/auth/v1/callback`
3. No agregar espacios, slash final adicional ni usar el callback de otro proyecto.
4. Mantener el Client Secret únicamente en Google/Supabase. No versionarlo ni exponerlo al navegador.

## Supabase Auth
En Authentication → Sign In / Providers → Google:

1. Activar Google.
2. Registrar el Client ID del cliente OAuth correspondiente.
3. Registrar el Client Secret desde Google Cloud.
4. Guardar.

En Authentication → URL Configuration:

- Site URL de producción: usar la URL pública definitiva del portal.
- Redirect URLs: incluir los orígenes/rutas de los despliegues autorizados, por ejemplo:
  - `https://adminterritorial-bit.github.io/HACIENDA_CONECTA/`
  - la URL oficial de Vercel/dominio institucional que se mantenga para producción.

El frontend usa PKCE y `redirectTo` hacia la base pública de la aplicación.

## Comprobación
El flujo esperado es:

Aplicación → Supabase `/auth/v1/authorize?provider=google` → Google → callback del proyecto `jppyk...` → Supabase → URL pública autorizada de Hacienda Conecta.

Si Google muestra `redirect_uri_mismatch`, revisar primero la URI autorizada del cliente en Google Cloud. Si Supabase responde `Unsupported provider: provider is not enabled`, revisar que Google esté habilitado en el proyecto Supabase correcto.
