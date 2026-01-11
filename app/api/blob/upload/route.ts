import { put } from "@vercel/blob";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return new Response("Missing file", { status: 400 });
  }

  // Store as public for now; we can tighten access + add per-user prefixes later.
  const key = `photos/${crypto.randomUUID()}-${file.name}`;
  const blob = await put(key, file, { access: "public" });

  return Response.json({ url: blob.url });
}
