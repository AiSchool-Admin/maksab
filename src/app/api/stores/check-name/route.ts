import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name || name.trim().length < 2) {
    return NextResponse.json({ available: false, error: "الاسم قصير أوي" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ available: true });
  }

  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data } = await adminClient
      .from("stores")
      .select("id")
      .ilike("name", name.trim())
      .maybeSingle();

    return NextResponse.json({ available: !data });
  } catch {
    return NextResponse.json({ available: true });
  }
}
