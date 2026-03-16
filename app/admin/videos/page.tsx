import Link from "next/link";
import { AdminVideos } from "@/app/admin/ui/AdminVideos";

export const dynamic = "force-dynamic";

export default function AdminVideosPage() {
  return (
    <div className="min-h-screen bg-emerald-50">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">YouTube Videos</h1>
            <p className="mt-1 text-sm text-gray-600">
              Add, edit, publish, and delete training videos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/waivers"
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
            >
              Waivers
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
            >
              Back to admin
            </Link>
          </div>
        </div>

        <AdminVideos />
      </main>
    </div>
  );
}
