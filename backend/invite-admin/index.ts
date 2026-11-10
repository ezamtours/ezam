// supabase/functions/invite-admin/index.ts
// Deploy this only to the dedicated EZAM project.
// Requires SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY secrets.
// Never expose SUPABASE_SERVICE_ROLE_KEY in browser code.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const OWNER_EMAIL = "ezamtourstravelservices01@gmail.com";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user || user.email?.toLowerCase() !== OWNER_EMAIL) {
    return Response.json({ error: "Owner access required." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const displayName = String(body.display_name ?? "").trim();
  if (!email) return Response.json({ error: "Email is required." }, { status: 400 });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName }
  });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  if (data.user?.id) {
    await admin.from("profiles")
      .update({ role: "admin", is_active: true, display_name: displayName || email.split("@")[0] })
      .eq("id", data.user.id);
  }

  return Response.json({ ok: true, user_id: data.user?.id ?? null });
});
