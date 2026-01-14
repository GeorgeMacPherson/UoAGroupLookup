// trigger redeploy
// supabase/functions/lookup/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}

function getOrigin(req: Request) {
  return Deno.env.get("CORS_ORIGIN") ?? "*";
}

Deno.serve(async (req) => {
  const origin = getOrigin(req);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ ok: false, message: "Use POST" }, 405, origin);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, message: "Invalid JSON" }, 400, origin);
  }

  const dob = String(payload?.dob ?? "").trim(); // expects YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return json({ ok: false, message: "DOB must be YYYY-MM-DD" }, 400, origin);
  }

  // Service role key is available to functions automatically via env:
  // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data, error } = await supabase
    .from("students")
    .select("name, dob, group_id")
    .eq("dob", dob)
    .order("name", { ascending: true });

  if (error) return json({ ok: false, message: error.message }, 500, origin);

  return json({ ok: true, matches: data ?? [] }, 200, origin);
});
