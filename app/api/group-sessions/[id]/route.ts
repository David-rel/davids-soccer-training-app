import { NextRequest, NextResponse } from "next/server";

import { getGroupSessionById } from "@/lib/groupSessions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = Number(id);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }

    const session = await getGroupSessionById(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session }, { status: 200 });
  } catch (error) {
    console.error("Failed to load group session", error);
    return NextResponse.json(
      { error: "Failed to load group session" },
      { status: 500 }
    );
  }
}
