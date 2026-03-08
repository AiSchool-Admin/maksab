// CRM Admin authentication helper
// Validates that the request comes from an authenticated admin user

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_PHONES = ["01000000000"]; // Fallback admin phones

/**
 * Get a Supabase client using service_role key (bypasses RLS).
 * Used for all CRM API routes.
 */
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

/**
 * Validate that the request has a valid admin session.
 * Returns null if valid, or an error NextResponse if invalid.
 */
export async function validateAdminRequest(req: NextRequest): Promise<NextResponse | null> {
  // In development, allow requests without auth if no service key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null; // Skip auth in dev without service key
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "غير مصرح — يجب تسجيل الدخول كمدير" },
      { status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json(
      { error: "غير مصرح — التوكن مفقود" },
      { status: 401 }
    );
  }

  // Verify the token with Supabase Auth
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json(
      { error: "غير مصرح — جلسة غير صالحة" },
      { status: 401 }
    );
  }

  // Check if user is admin by phone
  const phone = user.phone || user.user_metadata?.phone;
  if (!phone) {
    return NextResponse.json(
      { error: "غير مصرح — لا يوجد رقم هاتف مرتبط" },
      { status: 403 }
    );
  }

  // Check against admin phones in app_settings or fallback list
  try {
    const serviceClient = getServiceClient();
    const { data: settings } = await serviceClient
      .from("app_settings")
      .select("value")
      .eq("key", "admin_phones")
      .single();

    if (settings?.value) {
      const adminPhones: string[] = typeof settings.value === 'string'
        ? JSON.parse(settings.value)
        : settings.value;
      if (!adminPhones.includes(phone)) {
        return NextResponse.json(
          { error: "غير مصرح — ليس لديك صلاحيات المدير" },
          { status: 403 }
        );
      }
      return null; // Authorized
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: check hardcoded admin phones
  if (!ADMIN_PHONES.includes(phone)) {
    return NextResponse.json(
      { error: "غير مصرح — ليس لديك صلاحيات المدير" },
      { status: 403 }
    );
  }

  return null; // Authorized
}
