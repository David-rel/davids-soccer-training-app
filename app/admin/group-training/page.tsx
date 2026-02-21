import Link from "next/link";

export const dynamic = "force-dynamic";

export default function GroupTrainingPage() {
  return (
    <div className="min-h-screen bg-emerald-50">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Group Training</h1>
              <p className="mt-2 text-sm text-gray-600">
                This page is empty for now. We will build out group training tools here.
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
            >
              Back to admin
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
