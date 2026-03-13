import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { PublicGroupSessionsBrowser } from "@/app/ui/PublicGroupSessionsBrowser";
import { PublicSiteHeader } from "@/app/ui/PublicSiteHeader";
import { authOptions } from "@/lib/auth";
import { getUpcomingGroupSessions } from "@/lib/groupSessions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect("/players");
  }

  const sessions = await getUpcomingGroupSessions(100);

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-50 via-white to-white" />

      <PublicSiteHeader callbackUrl="/players" />

      <main className="relative mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900">Upcoming Group Sessions</h2>
          <p className="mt-2 text-sm text-gray-600">
            Browse open sessions by title or location, then open details to continue.
          </p>
          <PublicGroupSessionsBrowser sessions={sessions} />
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Already have an account?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Log in to manage players, see paid signups, and complete checkout faster.
            </p>
            <Link
              href="/login?callbackUrl=%2Fplayers"
              className="mt-4 inline-flex rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Log in
            </Link>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">New parent?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Create your account with email, phone number, and password. Then access your player portal.
            </p>
            <Link
              href="/signup?callbackUrl=%2Fplayers"
              className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Create account
            </Link>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">View player profile</h3>
            <p className="mt-2 text-sm text-gray-600">
              Go directly to the parent portal. If you are not logged in, you&apos;ll be prompted.
            </p>
            <Link
              href="/players"
              className="mt-4 inline-flex rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Open portal
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
