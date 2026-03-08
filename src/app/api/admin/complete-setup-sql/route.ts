/**
 * GET /api/admin/complete-setup-sql
 *
 * Returns the FULL database setup SQL from supabase/complete-setup.sql.
 * This file contains ALL tables, indexes, RLS policies, seed data, and CRM tables.
 * Copy and paste into Supabase SQL Editor to set up the complete database.
 */

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  try {
    const sqlPath = path.join(process.cwd(), "supabase", "complete-setup.sql");
    const sql = await fs.readFile(sqlPath, "utf-8");
    return new NextResponse(sql, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    // Fallback: return a message
    return new NextResponse(
      "-- Error: Could not read complete-setup.sql\n-- Please check the file exists at supabase/complete-setup.sql",
      {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        status: 500,
      }
    );
  }
}
