import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { put } from "@vercel/blob";
import { sql } from "@/db";
import { sendNewContentSubmissionEmail } from "@/lib/email";

// Configure route to accept large file uploads
export const maxDuration = 60; // Allow up to 60 seconds for upload
export const dynamic = "force-dynamic";

async function assertOwnsPlayer(req: NextRequest, playerId: string) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const parentId = token?.sub;
  if (!parentId)
    return {
      ok: false as const,
      res: new Response("Unauthorized", { status: 401 }),
    };

  const owns = (await sql`
    SELECT 1
    FROM players
    WHERE id = ${playerId} AND parent_id = ${parentId}
    LIMIT 1
  `) as unknown as Array<{ "?column?": number }>;

  if (owns.length === 0)
    return {
      ok: false as const,
      res: new Response("Not found", { status: 404 }),
    };
  return { ok: true as const, parentId };
}

type UploadRow = {
  id: string;
  player_id: string;
  video_url: string;
  description: string | null;
  status: string;
  upload_month: string;
  created_at: string;
  updated_at: string;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await ctx.params;
  const auth = await assertOwnsPlayer(req, playerId);
  if (!auth.ok) return auth.res;

  // Get current month (first day) for limit tracking
  const now = new Date();
  const uploadMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  // Check monthly limit (4 uploads per calendar month)
  const limitCheck = (await sql`
    SELECT COUNT(*) as count
    FROM player_video_uploads
    WHERE player_id = ${playerId} AND upload_month = ${uploadMonth}::date
  `) as unknown as Array<{ count: string }>;

  const currentCount = parseInt(limitCheck[0].count, 10);
  if (currentCount >= 4) {
    return new Response(
      "You have reached the maximum of 4 video uploads for this month. Limit resets on the 1st of next month.",
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const description = formData.get("description") as string | null;
  const durationSeconds = formData.get("durationSeconds") as string | null;

  if (!(file instanceof File)) {
    return new Response("Missing video file", { status: 400 });
  }

  // Validate duration (30s to 3min = 180s)
  const duration = durationSeconds ? parseFloat(durationSeconds) : 0;
  if (duration < 30 || duration > 180) {
    return new Response(
      "Video must be between 30 seconds and 3 minutes long",
      { status: 400 }
    );
  }

  // Validate file type (video formats)
  const validTypes = ["video/mp4", "video/quicktime", "video/webm"];
  if (!validTypes.includes(file.type)) {
    return new Response(
      "Invalid file type. Please upload MP4, MOV, or WEBM format.",
      { status: 400 }
    );
  }

  // Validate file size (max 500MB)
  const maxBytes = 500 * 1024 * 1024;
  if (file.size > maxBytes) {
    return new Response("File too large (max 500MB)", { status: 400 });
  }

  // Upload to Vercel Blob
  const key = `player-uploads/${playerId}/${crypto.randomUUID()}-${file.name}`;
  const blob = await put(key, file, { access: "public" });

  // Create database record
  const rows = (await sql`
    INSERT INTO player_video_uploads (
      player_id,
      video_url,
      description,
      status,
      upload_month
    )
    VALUES (
      ${playerId},
      ${blob.url},
      ${description?.trim() || null},
      'pending',
      ${uploadMonth}::date
    )
    RETURNING
      id,
      player_id,
      video_url,
      description,
      status,
      upload_month::text,
      created_at,
      updated_at
  `) as unknown as UploadRow[];

  const upload = rows[0];

  // Send response immediately
  const response = Response.json(
    {
      upload,
      message:
        "Video uploaded successfully. Coach will review and respond soon!",
      remaining: 4 - currentCount - 1,
    },
    { status: 201 }
  );

  // Send email notification AFTER response (fire and forget)
  // This runs asynchronously and doesn't block the response
  Promise.resolve().then(async () => {
    try {
      const playerRows = (await sql`
        SELECT name, birthdate, primary_position
        FROM players
        WHERE id = ${playerId}
        LIMIT 1
      `) as unknown as Array<{
        name: string;
        birthdate: string | null;
        primary_position: string | null;
      }>;

      if (playerRows.length > 0) {
        const player = playerRows[0];

        // Calculate age
        let age: number | null = null;
        if (player.birthdate) {
          const birthdateStr = String(player.birthdate);
          const [y, m, d] = birthdateStr.split("-").map(Number);
          const birthDate = new Date(y, m - 1, d);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const hasHadBirthday =
            today.getMonth() > birthDate.getMonth() ||
            (today.getMonth() === birthDate.getMonth() &&
              today.getDate() >= birthDate.getDate());
          if (!hasHadBirthday) age -= 1;
        }

        const playerInfo = [
          age ? `Age ${age}` : null,
          age ? `U${age}` : null,
          player.primary_position,
        ]
          .filter(Boolean)
          .join(" • ");

        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

        await sendNewContentSubmissionEmail({
          playerName: player.name,
          playerInfo: playerInfo || "Player",
          submissionTime: new Date(upload.created_at).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          adminReviewUrl: `${baseUrl}/admin/player/${playerId}#content-submissions`,
          description: upload.description,
        });
      }
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
    }
  });

  return response;
}
