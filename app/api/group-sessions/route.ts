import { NextRequest, NextResponse } from "next/server";

import { getUpcomingGroupSessions } from "@/lib/groupSessions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 100);

    const sessions = await getUpcomingGroupSessions(limit);
    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error) {
    console.error("Failed to load group sessions", error);
    return NextResponse.json(
      { error: "Failed to load group sessions" },
      { status: 500 }
    );
  }
}
