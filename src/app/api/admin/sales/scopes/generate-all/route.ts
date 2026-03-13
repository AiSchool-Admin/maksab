import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateAllScopes } from "@/lib/harvester/scope-generator";

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing Supabase config" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const result = await generateAllScopes(supabase);

    return NextResponse.json({
      success: result.errors.length === 0,
      ...result,
      message: `تم إنشاء ${result.created} نطاق جديد وتحديث ${result.updated} نطاق (تم تخطي ${result.skipped})${
        result.errors.length > 0 ? ` — ${result.errors.length} خطأ` : ""
      }`,
    });
  } catch (error: any) {
    console.error("[generate-all] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "حصل خطأ" },
      { status: 500 }
    );
  }
}
