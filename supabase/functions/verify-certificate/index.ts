import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: cors
    });
  }

  try {
    const body = await req.json();
    const token = String(body?.token ?? "").trim();

    if (token.length < 32 || token.length > 256) {
      return new Response(JSON.stringify({ valid: false, error: "Token inválido" }), {
        status: 400,
        headers: cors
      });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceRole) throw new Error("Configuración interna incompleta");

    const admin = createClient(url, serviceRole, {
      auth: { persistSession: false }
    });

    const tokenHash = await sha256(token);
    const { data, error } = await admin
      .from("certificates")
      .select("serial,type,issued_at,revoked_at,document_sha256")
      .eq("verification_token_hash", tokenHash)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 404,
        headers: cors
      });
    }

    return new Response(
      JSON.stringify({
        valid: data.revoked_at === null,
        serial: data.serial,
        type: data.type,
        issuedAt: data.issued_at,
        revoked: data.revoked_at !== null,
        documentSha256: data.document_sha256
      }),
      { status: 200, headers: cors }
    );
  } catch (error) {
    console.error("certificate verification failed", error);
    return new Response(
      JSON.stringify({ error: "No fue posible verificar el certificado" }),
      { status: 500, headers: cors }
    );
  }
});
