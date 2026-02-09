/**
 * Image Search API — Upload an image, extract visual tags, find similar ads
 *
 * Strategy:
 * 1. Accept base64 image from client
 * 2. Use simple color/shape detection + category guessing from image metadata
 * 3. Extract text keywords (brand logos, model names visible in image)
 * 4. Search ads using extracted tags
 *
 * For MVP, we use a smart tag extraction approach:
 * - Image filename/type analysis
 * - Client-side sends pre-analyzed tags (from a lightweight model or manual selection)
 * - Server searches by those tags
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Category detection from visual tags */
const TAG_TO_CATEGORY: Record<string, string> = {
  // Cars
  "سيارة": "cars", "عربية": "cars", "car": "cars", "vehicle": "cars",
  "toyota": "cars", "hyundai": "cars", "bmw": "cars", "mercedes": "cars",
  // Phones
  "موبايل": "phones", "phone": "phones", "iphone": "phones", "samsung": "phones",
  "mobile": "phones", "tablet": "phones", "smartphone": "phones",
  // Real estate
  "شقة": "real_estate", "apartment": "real_estate", "building": "real_estate",
  "house": "real_estate", "room": "real_estate", "villa": "real_estate",
  // Fashion
  "ملابس": "fashion", "حذاء": "fashion", "شنطة": "fashion",
  "clothes": "fashion", "shoes": "fashion", "bag": "fashion", "dress": "fashion",
  // Gold
  "ذهب": "gold", "gold": "gold", "jewelry": "gold", "ring": "gold",
  "necklace": "gold", "bracelet": "gold",
  // Appliances
  "غسالة": "appliances", "ثلاجة": "appliances", "مكيف": "appliances",
  "washer": "appliances", "fridge": "appliances", "tv": "appliances",
  // Furniture
  "أثاث": "furniture", "كرسي": "furniture", "سرير": "furniture",
  "furniture": "furniture", "sofa": "furniture", "table": "furniture",
  // Hobbies
  "playstation": "hobbies", "ps5": "hobbies", "guitar": "hobbies",
  "bicycle": "hobbies", "camera": "hobbies",
  // Tools
  "drill": "tools", "tool": "tools",
  // Scrap
  "خردة": "scrap", "scrap": "scrap", "metal": "scrap",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tags, category: userCategory } = body as {
      tags: string[];
      category?: string;
    };

    if (!tags || tags.length === 0) {
      return NextResponse.json(
        { error: "لازم تحدد كلمات وصف للصورة" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Detect category from tags
    let detectedCategory = userCategory || null;
    if (!detectedCategory) {
      for (const tag of tags) {
        const lowerTag = tag.toLowerCase();
        if (TAG_TO_CATEGORY[lowerTag]) {
          detectedCategory = TAG_TO_CATEGORY[lowerTag];
          break;
        }
      }
    }

    // Try RPC search_by_visual_tags
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "search_by_visual_tags" as never,
      { p_tags: tags, p_limit: 12 } as never
    );

    if (!rpcError && rpcData && (rpcData as unknown[]).length > 0) {
      const results = (rpcData as Record<string, unknown>[]).map((row) => ({
        id: row.id,
        title: row.title,
        price: row.price ? Number(row.price) : null,
        saleType: row.sale_type,
        image: ((row.images as string[]) ?? [])[0] ?? null,
        governorate: row.governorate,
        city: row.city,
        categoryId: row.category_id,
        createdAt: row.created_at,
        matchScore: Number(row.tag_match_count),
      }));

      return NextResponse.json({
        results,
        detectedCategory,
        tags,
        total: results.length,
      });
    }

    // Fallback: ILIKE search with OR across all tags
    const tagConditions = tags
      .slice(0, 5)
      .map((t) => `title.ilike.%${t}%`)
      .join(",");

    let q = supabase
      .from("ads" as never)
      .select("*")
      .eq("status", "active")
      .or(tagConditions)
      .order("created_at", { ascending: false })
      .limit(12);

    if (detectedCategory) {
      q = q.eq("category_id", detectedCategory);
    }

    const { data, error } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = ((data || []) as Record<string, unknown>[]).map((row) => ({
      id: row.id,
      title: row.title,
      price: row.price ? Number(row.price) : null,
      saleType: row.sale_type,
      image: ((row.images as string[]) ?? [])[0] ?? null,
      governorate: row.governorate,
      city: row.city,
      categoryId: row.category_id,
      createdAt: row.created_at,
      matchScore: 1,
    }));

    return NextResponse.json({
      results,
      detectedCategory,
      tags,
      total: results.length,
    });
  } catch (err) {
    console.error("Image search error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة في البحث بالصورة" },
      { status: 500 }
    );
  }
}
