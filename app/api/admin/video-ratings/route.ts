import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

async function assertIsAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
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

export async function GET(req: NextRequest) {
  const auth = await assertIsAdmin(req);
  if (!auth.ok) return auth.res;

  try {
    const ratingsRaw = await sql`
      SELECT
        v.id as video_id,
        v.title as video_title,
        v.video_url,
        v.category,
        ROUND(AVG(ve.rating_stars)::numeric, 2) as avg_rating,
        COUNT(ve.rating_stars) as rating_count,
        COUNT(CASE WHEN ve.rating_stars = 1 THEN 1 END) as one_star,
        COUNT(CASE WHEN ve.rating_stars = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN ve.rating_stars = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN ve.rating_stars = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN ve.rating_stars = 5 THEN 1 END) as five_star
      FROM videos v
      INNER JOIN video_engagement ve ON v.id = ve.video_id
      WHERE ve.rating_stars IS NOT NULL
      GROUP BY v.id, v.title, v.video_url, v.category
      ORDER BY avg_rating DESC, rating_count DESC
    `;

    // Convert numeric fields from strings to numbers
    const ratings = ratingsRaw.map((r: any) => ({
      ...r,
      avg_rating: parseFloat(r.avg_rating),
      rating_count: parseInt(r.rating_count),
      one_star: parseInt(r.one_star),
      two_star: parseInt(r.two_star),
      three_star: parseInt(r.three_star),
      four_star: parseInt(r.four_star),
      five_star: parseInt(r.five_star),
    }));

    return Response.json({ ratings });
  } catch (error) {
    console.error("Error fetching video ratings:", error);
    return Response.json(
      { error: "Failed to fetch video ratings" },
      { status: 500 }
    );
  }
}
