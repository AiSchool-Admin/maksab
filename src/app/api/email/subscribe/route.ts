import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/email/subscribe
 *
 * Subscribe an email address to the weekly newsletter.
 * Body: { email: string, utm_source?: string, utm_campaign?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, utm_source, utm_campaign } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "ادخل إيميل صحيح" },
        { status: 400 },
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "صيغة الإيميل مش صحيحة" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Insert or ignore (if already subscribed)
    const { error } = await (supabase
      .from("email_subscribers" as never) as unknown as {
        upsert: (data: Record<string, unknown>, options: Record<string, string>) => Promise<{ error: { code: string; message: string } | null }>;
      })
      .upsert(
        {
          email: email.toLowerCase().trim(),
          utm_source: utm_source || null,
          utm_campaign: utm_campaign || null,
          is_active: true,
        },
        { onConflict: "email" },
      );

    if (error) {
      // Duplicate is fine — re-activate
      if (error.code === "23505") {
        await supabase
          .from("email_subscribers" as never)
          .update({ is_active: true } as never)
          .eq("email" as never, email.toLowerCase().trim() as never);
      } else {
        console.error("Email subscribe error:", error);
        return NextResponse.json(
          { error: "حصل مشكلة — جرب تاني" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "حصل مشكلة — جرب تاني" },
      { status: 500 },
    );
  }
}
