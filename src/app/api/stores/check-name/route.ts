import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const RESERVED_NAMES = ["create", "dashboard", "settings", "admin", "api", "login", "null", "undefined", "مكسب", "maksab"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ available: false, error: "الاسم قصير أوي" });
  }

  if (name.trim().length > 30) {
    return NextResponse.json({ available: false, error: "الاسم طويل أوي (أقصى حد 30 حرف)" });
  }

  if (RESERVED_NAMES.some((r) => r.toLowerCase() === name.trim().toLowerCase())) {
    return NextResponse.json({ available: false, error: "الاسم ده محجوز ومينفعش يتسجل" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    // Can't verify — return error so client shows neutral state
    return NextResponse.json({ available: null, error: "لا يمكن التحقق حالياً" });
  }

  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await adminClient
      .from("stores")
      .select("id")
      .ilike("name", name.trim())
      .maybeSingle();

    if (error) {
      return NextResponse.json({ available: null, error: "فشل التحقق من الاسم" });
    }

    return NextResponse.json({ available: !data });
  } catch {
    return NextResponse.json({ available: null, error: "فشل التحقق من الاسم" });
  }
}
