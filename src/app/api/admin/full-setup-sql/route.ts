/**
 * GET /api/admin/full-setup-sql
 *
 * Returns ALL migration SQL files concatenated into a single script.
 * Copy this and run it in Supabase SQL Editor to set up the complete database.
 *
 * Query params:
 *   ?from=N  — Start from migration N (default 1)
 *   ?to=N    — End at migration N (default: all)
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const from = parseInt(url.searchParams.get("from") || "1", 10);
  const to = parseInt(url.searchParams.get("to") || "999", 10);

  try {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");

    let files: string[];
    try {
      files = await fs.readdir(migrationsDir);
    } catch {
      return NextResponse.json(
        { error: "مجلد migrations مش موجود" },
        { status: 404 },
      );
    }

    // Sort migration files by their numeric prefix
    const sqlFiles = files
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .filter((f) => {
        const num = parseInt(f.split("_")[0], 10);
        return num >= from && num <= to;
      });

    if (sqlFiles.length === 0) {
      return new NextResponse("-- No migration files found", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const parts: string[] = [
      "-- ══════════════════════════════════════════════════════════════",
      "-- مكسب (Maksab) — Full Database Setup",
      `-- Generated: ${new Date().toISOString()}`,
      `-- Migrations: ${sqlFiles[0]} → ${sqlFiles[sqlFiles.length - 1]}`,
      `-- Total files: ${sqlFiles.length}`,
      "-- ",
      "-- INSTRUCTIONS:",
      "-- 1. Open Supabase Dashboard → SQL Editor",
      "-- 2. Paste this entire script",
      "-- 3. Click 'Run'",
      "-- 4. Go to /admin/setup to seed categories & governorates",
      "-- ══════════════════════════════════════════════════════════════",
      "",
    ];

    for (const file of sqlFiles) {
      const content = await fs.readFile(
        path.join(migrationsDir, file),
        "utf-8",
      );
      parts.push(`-- ── ${file} ${"─".repeat(Math.max(0, 50 - file.length))}──`);
      parts.push(content.trim());
      parts.push("");
      parts.push("");
    }

    parts.push("-- ══════════════════════════════════════════════════════════════");
    parts.push("-- Setup complete! Now go to /admin/setup to seed data.");
    parts.push("-- ══════════════════════════════════════════════════════════════");

    return new NextResponse(parts.join("\n"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": "inline; filename=maksab-full-setup.sql",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
