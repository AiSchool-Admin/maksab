/**
 * GET/POST /api/admin/settings
 *
 * Manage app-level settings (API keys, configuration).
 * Requires admin authentication via x-admin-id header.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin/admin-service";
import {
  getAllSettings,
  getSetting,
  setSetting,
  deleteSetting,
} from "@/lib/admin/settings-service";

async function checkAdmin(req: NextRequest): Promise<string | null> {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return null;
  const isAdmin = await verifyAdmin(adminId);
  return isAdmin ? adminId : null;
}

/** GET — list all settings or get a specific one */
export async function GET(req: NextRequest) {
  const adminId = await checkAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (key) {
    const value = await getSetting(key);
    return NextResponse.json({ key, value });
  }

  const settings = await getAllSettings();
  return NextResponse.json(settings);
}

/** POST — create or update a setting */
export async function POST(req: NextRequest) {
  const adminId = await checkAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, value, description, is_secret } = body as {
      key: string;
      value: string;
      description?: string;
      is_secret?: boolean;
    };

    if (!key || typeof value !== "string") {
      return NextResponse.json(
        { error: "key and value are required" },
        { status: 400 },
      );
    }

    const success = await setSetting(key, value, description, is_secret, adminId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to save setting" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}

/** DELETE — remove a setting */
export async function DELETE(req: NextRequest) {
  const adminId = await checkAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  const success = await deleteSetting(key);
  return NextResponse.json({ success });
}
