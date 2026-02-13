/**
 * GET  /api/chat/members?conversation_id=xxx — List all conversation members
 * POST /api/chat/members — Add or remove a member from a conversation
 *
 * POST body:
 *   { action: "add",    conversation_id, inviter_id, phone }
 *   { action: "remove", conversation_id, remover_id, member_id }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── Service client (server-side only) ────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Constants ────────────────────────────────────────────────────────────

const MAX_ADDITIONAL_MEMBERS = 3;

// ── GET — List members ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json(
        { error: "لازم تحدد المحادثة" },
        { status: 400 },
      );
    }

    const client = getServiceClient();
    if (!client) {
      return NextResponse.json(
        { error: "خطأ في الخادم" },
        { status: 500 },
      );
    }

    // Fetch conversation to get buyer + seller
    const { data: convData, error: convError } = await client
      .from("conversations")
      .select("buyer_id, seller_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (convError || !convData) {
      return NextResponse.json(
        { error: "المحادثة مش موجودة" },
        { status: 404 },
      );
    }

    const conv = convData as Record<string, unknown>;
    const buyerId = conv.buyer_id as string;
    const sellerId = conv.seller_id as string;

    // Build member list: buyer + seller + additional members
    const members: Record<string, unknown>[] = [];

    // Fetch buyer profile
    const { data: buyerData } = await client
      .from("profiles")
      .select("display_name, avatar_url, phone")
      .eq("id", buyerId)
      .maybeSingle();

    const buyerProfile = buyerData as Record<string, unknown> | null;
    members.push({
      id: `buyer-${buyerId}`,
      conversation_id: conversationId,
      user_id: buyerId,
      display_name: buyerProfile
        ? (buyerProfile.display_name as string) || "مستخدم"
        : "مستخدم",
      avatar_url: buyerProfile
        ? (buyerProfile.avatar_url as string) || null
        : null,
      phone: buyerProfile ? (buyerProfile.phone as string) || "" : "",
      role: "buyer",
      added_by: null,
      added_at: null,
    });

    // Fetch seller profile
    const { data: sellerData } = await client
      .from("profiles")
      .select("display_name, avatar_url, phone")
      .eq("id", sellerId)
      .maybeSingle();

    const sellerProfile = sellerData as Record<string, unknown> | null;
    members.push({
      id: `seller-${sellerId}`,
      conversation_id: conversationId,
      user_id: sellerId,
      display_name: sellerProfile
        ? (sellerProfile.display_name as string) || "مستخدم"
        : "مستخدم",
      avatar_url: sellerProfile
        ? (sellerProfile.avatar_url as string) || null
        : null,
      phone: sellerProfile ? (sellerProfile.phone as string) || "" : "",
      role: "seller",
      added_by: null,
      added_at: null,
    });

    // Fetch additional members
    const { data: additionalData } = await client
      .from("conversation_members")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("added_at", { ascending: true });

    if (additionalData) {
      for (const row of additionalData as Record<string, unknown>[]) {
        const { data: profileData } = await client
          .from("profiles")
          .select("display_name, avatar_url, phone")
          .eq("id", row.user_id as string)
          .maybeSingle();

        const profile = profileData as Record<string, unknown> | null;
        members.push({
          id: row.id,
          conversation_id: conversationId,
          user_id: row.user_id,
          display_name: profile
            ? (profile.display_name as string) || "مستخدم"
            : "مستخدم",
          avatar_url: profile
            ? (profile.avatar_url as string) || null
            : null,
          phone: profile ? (profile.phone as string) || "" : "",
          role: "member",
          added_by: row.added_by,
          added_at: row.added_at,
        });
      }
    }

    return NextResponse.json({ success: true, members });
  } catch (err) {
    console.error("[chat/members] GET error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}

// ── POST — Add or remove member ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, conversation_id } = body;

    if (!action || !conversation_id) {
      return NextResponse.json(
        { error: "بيانات ناقصة" },
        { status: 400 },
      );
    }

    if (!["add", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "الأكشن لازم يكون add أو remove" },
        { status: 400 },
      );
    }

    const client = getServiceClient();
    if (!client) {
      return NextResponse.json(
        { error: "خطأ في الخادم" },
        { status: 500 },
      );
    }

    // Fetch conversation to get buyer + seller
    const { data: convData, error: convError } = await client
      .from("conversations")
      .select("buyer_id, seller_id")
      .eq("id", conversation_id)
      .maybeSingle();

    if (convError || !convData) {
      return NextResponse.json(
        { error: "المحادثة مش موجودة" },
        { status: 404 },
      );
    }

    const conv = convData as Record<string, unknown>;
    const buyerId = conv.buyer_id as string;
    const sellerId = conv.seller_id as string;

    // ── Add member ───────────────────────────────────────────────────────

    if (action === "add") {
      const { inviter_id, phone } = body;

      if (!inviter_id || !phone) {
        return NextResponse.json(
          { error: "لازم تبعت inviter_id و phone" },
          { status: 400 },
        );
      }

      // Only buyer can add
      if (buyerId !== inviter_id) {
        return NextResponse.json(
          { error: "المشتري بس هو اللي يقدر يضيف أعضاء للمحادثة" },
          { status: 403 },
        );
      }

      // Validate phone format
      const normalized = phone.replace(/\s|-/g, "");
      if (!/^01[0125]\d{8}$/.test(normalized)) {
        return NextResponse.json(
          { error: "رقم الموبايل مش صحيح. لازم يبدأ بـ 01 ويكون 11 رقم" },
          { status: 400 },
        );
      }

      // Find user by phone
      const { data: userToAdd } = await client
        .from("profiles")
        .select("id, display_name, avatar_url, phone")
        .eq("phone", normalized)
        .maybeSingle();

      if (!userToAdd) {
        return NextResponse.json(
          {
            error:
              "مفيش حساب مسجل بالرقم ده. لازم الشخص يكون عنده حساب على مكسب",
          },
          { status: 404 },
        );
      }

      const user = userToAdd as Record<string, unknown>;
      const userId = user.id as string;

      // Can't add buyer or seller
      if (userId === buyerId) {
        return NextResponse.json(
          { error: "أنت أصلاً عضو في المحادثة دي" },
          { status: 400 },
        );
      }
      if (userId === sellerId) {
        return NextResponse.json(
          { error: "البائع أصلاً عضو في المحادثة دي" },
          { status: 400 },
        );
      }

      // Check if already a member
      const { data: existingMember } = await client
        .from("conversation_members")
        .select("id")
        .eq("conversation_id", conversation_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json(
          { error: "الشخص ده موجود في المحادثة بالفعل" },
          { status: 409 },
        );
      }

      // Check member limit
      const { count: currentCount } = await client
        .from("conversation_members")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversation_id);

      if ((currentCount ?? 0) >= MAX_ADDITIONAL_MEMBERS) {
        return NextResponse.json(
          {
            error: `وصلت للحد الأقصى (${MAX_ADDITIONAL_MEMBERS} أعضاء إضافيين). مش ممكن تضيف أكتر من كده`,
          },
          { status: 400 },
        );
      }

      // Insert
      const now = new Date().toISOString();
      const { data: inserted, error: insertError } = await client
        .from("conversation_members")
        .insert({
          conversation_id,
          user_id: userId,
          added_by: inviter_id,
          added_at: now,
        })
        .select()
        .maybeSingle();

      if (insertError || !inserted) {
        console.error("[chat/members] add insert error:", insertError);
        return NextResponse.json(
          { error: "حصل مشكلة في إضافة العضو. جرب تاني" },
          { status: 500 },
        );
      }

      const row = inserted as Record<string, unknown>;

      return NextResponse.json({
        success: true,
        message: "تم إضافة العضو للمحادثة",
        member: {
          id: row.id,
          conversation_id,
          user_id: userId,
          display_name: (user.display_name as string) || "مستخدم",
          avatar_url: (user.avatar_url as string) || null,
          phone: (user.phone as string) || normalized,
          role: "member",
          added_by: inviter_id,
          added_at: now,
        },
      });
    }

    // ── Remove member ────────────────────────────────────────────────────

    if (action === "remove") {
      const { remover_id, member_id } = body;

      if (!remover_id || !member_id) {
        return NextResponse.json(
          { error: "لازم تبعت remover_id و member_id" },
          { status: 400 },
        );
      }

      // Only buyer can remove
      if (buyerId !== remover_id) {
        return NextResponse.json(
          { error: "المشتري بس هو اللي يقدر يشيل أعضاء من المحادثة" },
          { status: 403 },
        );
      }

      // Can't remove buyer or seller
      if (member_id === buyerId) {
        return NextResponse.json(
          { error: "مش ممكن تشيل المشتري من المحادثة" },
          { status: 400 },
        );
      }
      if (member_id === sellerId) {
        return NextResponse.json(
          { error: "مش ممكن تشيل البائع من المحادثة" },
          { status: 400 },
        );
      }

      // Check the member exists
      const { data: existingMember } = await client
        .from("conversation_members")
        .select("id")
        .eq("conversation_id", conversation_id)
        .eq("user_id", member_id)
        .maybeSingle();

      if (!existingMember) {
        return NextResponse.json(
          { error: "العضو ده مش موجود في المحادثة" },
          { status: 404 },
        );
      }

      // Delete
      const { error: deleteError } = await client
        .from("conversation_members")
        .delete()
        .eq("conversation_id", conversation_id)
        .eq("user_id", member_id);

      if (deleteError) {
        console.error("[chat/members] remove delete error:", deleteError);
        return NextResponse.json(
          { error: "حصل مشكلة في إزالة العضو. جرب تاني" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "تم إزالة العضو من المحادثة",
      });
    }

    return NextResponse.json({ error: "أكشن غير معروف" }, { status: 400 });
  } catch (err) {
    console.error("[chat/members] POST error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
