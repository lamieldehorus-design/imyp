import { createClient } from "npm:@supabase/supabase-js@2";

function secretKey() {
  const bundle = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (bundle) {
    const parsed = JSON.parse(bundle);
    return parsed.default || Object.values(parsed)[0];
  }
  return Deno.env.get("SUPABASE_SECRET_KEY")
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    || "";
}

export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, secretKey(), {
    auth:{persistSession:false,autoRefreshToken:false}
  });
}

export async function requireAdmin(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i,"");
  if (!token) return {ok:false,status:401,error:"missing_token"} as const;

  const db=adminClient();
  const {data:userData,error:userError}=await db.auth.getUser(token);
  if (userError || !userData.user) return {ok:false,status:401,error:"invalid_token"} as const;

  const {data:admin,error:adminError}=await db
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id",userData.user.id)
    .maybeSingle();

  if (adminError || !admin) return {ok:false,status:403,error:"not_admin"} as const;
  return {ok:true,user:userData.user,db} as const;
}
