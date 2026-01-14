import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

async function assertIsAdmin(req: NextRequest) {
  const token = await getToken({ req });
  const userId = token?.sub;
  if (!userId) {
    return { ok: false as const, res: new Response("Unauthorized", { status: 401 }) };
  }

  const securityCode = req.headers.get("x-security-code");
  if (securityCode !== process.env.SECURITY_CODE) {
    return { ok: false as const, res: new Response("Forbidden", { status: 403 }) };
  }

  return { ok: true as const, userId };
}

// GET all video reports
export async function GET(req: NextRequest) {
  const auth = await assertIsAdmin(req);
  if (!auth.ok) return auth.res;

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") || "pending";

    // Support comma-separated status values
    const statuses = statusParam.split(",").map(s => s.trim());

    const reports = await sql`
      SELECT
        vr.id,
        vr.reason,
        vr.description,
        vr.status,
        vr.created_at,
        vr.resolved_at,
        v.id as video_id,
        v.title as video_title,
        v.video_url,
        v.category,
        p.id as player_id,
        p.name as player_name
      FROM video_reports vr
      INNER JOIN videos v ON vr.video_id = v.id
      INNER JOIN players p ON vr.player_id = p.id
      WHERE vr.status = ANY(${statuses})
      ORDER BY vr.created_at DESC
    `;

    return Response.json({ reports });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return Response.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

// PATCH to update report status
export async function PATCH(req: NextRequest) {
  const auth = await assertIsAdmin(req);
  if (!auth.ok) return auth.res;

  try {
    const body = await req.json();
    const { reportId, status, action } = body;

    if (!reportId || !status) {
      return Response.json(
        { error: "reportId and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "reviewed", "resolved", "dismissed"];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const now = new Date().toISOString();

    await sql`
      UPDATE video_reports
      SET
        status = ${status},
        resolved_at = ${status === "resolved" || status === "dismissed" ? now : null},
        resolved_by = ${auth.userId}
      WHERE id = ${reportId}
    `;

    // If action is "remove_video", unpublish the video
    if (action === "remove_video") {
      const report = await sql`
        SELECT video_id FROM video_reports WHERE id = ${reportId} LIMIT 1
      `;
      if (report.length > 0) {
        await sql`
          UPDATE videos
          SET published = false
          WHERE id = ${report[0].video_id}
        `;
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating report:", error);
    return Response.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}
