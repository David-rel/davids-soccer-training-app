import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { LoginForm } from "@/app/ui/LoginForm";
import { PublicSiteHeader } from "@/app/ui/PublicSiteHeader";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) || {};
  const callbackUrl = params.callbackUrl || "/players";

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect(callbackUrl);
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-50 via-white to-white" />

      <PublicSiteHeader callbackUrl={callbackUrl} />

      <main className="relative mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">Parent login</h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in with your email or phone number and password to manage players, view profiles, and register for sessions.
            </p>
            <div className="mt-6">
              <LoginForm callbackUrl={callbackUrl} />
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900">Need an account?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Create a parent account to access your player portal and complete group session signup and checkout.
            </p>
            <Link
              href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Create account
            </Link>

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">What you can do after login</p>
              <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                <li>View and edit player profile details.</li>
                <li>Track paid group-session signups.</li>
                <li>Use saved parent/player info during checkout.</li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
