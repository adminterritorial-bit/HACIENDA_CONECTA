import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store"
};

const encoder = new TextEncoder();
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim().toLowerCase() : "";
    if (!/^[0-9a-f]{48}$/.test(token)) {
      return new Response(JSON.stringify({ valid: false }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("service_configuration_missing");

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const hash = await sha256Hex(token);
    const { data, error } = await supabase
      .from("hc_certificates")
      .select("serial,type,issued_at,revoked_at,document_sha256")
      .eq("verification_token_hash", hash)
      .maybeSingle();

    if (error) throw error;
    if (!data) return new Response(JSON.stringify({ valid: false }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({
      valid: !data.revoked_at,
      revoked: Boolean(data.revoked_at),
      serial: data.serial,
      type: data.type,
      issuedAt: data.issued_at,
      documentSha256: data.document_sha256
    }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "verification_unavailable" }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
  }
});