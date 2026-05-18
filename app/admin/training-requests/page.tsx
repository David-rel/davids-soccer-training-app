import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { sql } from "@/db";
import { TrainingRequestsClient } from "./ui/TrainingRequestsClient";

export const dynamic = "force-dynamic";

type TrainingRequest = {
  id: string;
  parent_name: string;
  player_name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  availability: string;
  status: string;
  created_at: string;
};

export default async function TrainingRequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/admin");

  const requests = (await sql`
    SELECT id, parent_name, player_name, phone, email, location,
           availability, status, created_at
    FROM training_requests
    WHERE status = 'pending'
    ORDER BY created_at DESC
  `) as unknown as TrainingRequest[];

  return (
    <div className="min-h-screen bg-emerald-50">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Training Requests</h1>
            <p className="mt-1 text-sm text-gray-600">
              {requests.length === 0
                ? "No pending requests."
                : `${requests.length} pending request${requests.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
          >
            Back to admin
          </Link>
        </div>

        <TrainingRequestsClient initialRequests={requests} />
      </main>
    </div>
  );
}
