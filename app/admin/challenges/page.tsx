import Link from "next/link";
import AdminChallengesClient from "./ui/AdminChallengesClient";

export const dynamic = "force-dynamic";

export default function AdminChallengesPage() {
  return (
    <div className="min-h-screen bg-emerald-50">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Challenges</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage player challenges and review submissions.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
          >
            Back to admin
          </Link>
        </div>

        <AdminChallengesClient />
      </main>
    </div>
  );
}
