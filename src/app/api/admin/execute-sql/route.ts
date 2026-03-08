/**
 * POST /api/admin/execute-sql
 *
 * Executes SQL statements against Supabase using the service role key.
 * This endpoint first creates an exec_sql RPC function, then uses it
 * to execute the provided SQL.
 *
 * Request body: { sql: string, serviceKey?: string }
 * - sql: The SQL to execute
 * - serviceKey: Optional service role key (falls back to env var)
 *
 * Security: Requires either SUPABASE_SERVICE_ROLE_KEY env var or
 * serviceKey in body. Never exposes the key in responses.
 */

export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

interface ExecResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
}

async function executeSQL(
  supabaseUrl: string,
  serviceKey: string,
  sql: string
): Promise<ExecResult> {
  // Use Supabase's pg-meta SQL execution endpoint
  // POST /pg/query with service role key
  const pgMetaUrl = `${supabaseUrl}/rest/v1/rpc/exec_sql`;

  // First try using the exec_sql RPC function
  const rpcRes = await fetch(pgMetaUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (rpcRes.ok) {
    return { success: true, message: "تم تنفيذ SQL بنجاح" };
  }

  // If RPC doesn't exist, create it first via the SQL endpoint
  const createRpcSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(query text)
    RETURNS void AS $$
    BEGIN
      EXECUTE query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  // Try the Supabase SQL API (available in newer Supabase versions)
  // This uses the pg endpoint that accepts raw SQL
  const sqlApiUrl = `${supabaseUrl}/pg/query`;

  try {
    // Attempt 1: Use /pg/query endpoint (Supabase v2+)
    const sqlRes = await fetch(sqlApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: createRpcSQL }),
    });

    if (sqlRes.ok) {
      // Now execute the actual SQL using the same endpoint
      const execRes = await fetch(sqlApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (execRes.ok) {
        return { success: true, message: "تم تنفيذ SQL بنجاح" };
      }

      const execErr = await execRes.text();
      return {
        success: false,
        error: "فشل تنفيذ SQL",
        details: execErr,
      };
    }
  } catch {
    // /pg/query not available, try alternative
  }

  // Attempt 2: Use Supabase Management API
  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/\/\/([^.]+)\./)?.[1];
  if (projectRef) {
    try {
      // Try the Supabase SQL API v1
      const mgmtUrl = `https://${projectRef}.supabase.co/rest/v1/`;

      // Create exec_sql function by running it as individual statements
      // via the rpc endpoint after creating it through an alternative method
      const createFnRes = await fetch(
        `${supabaseUrl}/rest/v1/rpc/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ sql: createRpcSQL }),
        }
      );

      // If none of the SQL execution methods work, return instructions
      if (!createFnRes.ok) {
        return {
          success: false,
          error: "مش قادر ينفذ SQL مباشرة",
          details:
            "لازم تنسخ الـ SQL وتشغله في Supabase SQL Editor يدوي. افتح /api/admin/full-setup-sql عشان تاخد الكود الكامل.",
        };
      }

      // Now try executing via exec_sql
      const retryRes = await fetch(pgMetaUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (retryRes.ok) {
        return { success: true, message: "تم تنفيذ SQL بنجاح" };
      }
    } catch {
      // Management API not accessible
    }
  }

  return {
    success: false,
    error: "مش قادر ينفذ SQL مباشرة من السيرفر",
    details:
      "انسخ الـ SQL من /api/admin/full-setup-sql وشغله في Supabase SQL Editor.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sql, serviceKey: bodyKey } = body;

    if (!sql) {
      return NextResponse.json(
        { success: false, error: "مفيش SQL مرسل" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = bodyKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { success: false, error: "NEXT_PUBLIC_SUPABASE_URL مش موجود" },
        { status: 500 }
      );
    }

    if (!serviceKey) {
      return NextResponse.json(
        {
          success: false,
          error: "محتاج Service Role Key — أدخله في الصفحة أو حطه في البيئة",
        },
        { status: 400 }
      );
    }

    const result = await executeSQL(supabaseUrl, serviceKey, sql);
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "حصلت مشكلة",
      },
      { status: 500 }
    );
  }
}
