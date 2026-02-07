import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * GET /api/admin/complete-setup-sql
 *
 * Returns the complete-setup.sql file content for copying into SQL Editor.
 */
export async function GET() {
  try {
    const sqlPath = join(process.cwd(), "supabase", "complete-setup.sql");
    const sql = readFileSync(sqlPath, "utf-8");
    return new NextResponse(sql, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { error: "مش لاقي ملف complete-setup.sql" },
      { status: 404 },
    );
  }
}
