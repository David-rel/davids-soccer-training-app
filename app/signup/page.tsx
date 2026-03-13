import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { PublicSiteHeader } from "@/app/ui/PublicSiteHeader";
import { SignupForm } from "@/app/ui/SignupForm";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SignupPageProps = {
  searchParams?: Promise<{ callbackUrl?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
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
            <h2 className="text-2xl font-semibold text-gray-900">Create parent account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign up with your email, phone number, and password. You&apos;ll be logged in and taken to your player portal.
            </p>
            <div className="mt-6">
              <SignupForm callbackUrl={callbackUrl} />
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900">Already have an account?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Use your existing email/phone and password.
            </p>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="mt-4 inline-flex rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Go to login
            </Link>

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">After signup</p>
              <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                <li>Access your player dashboard instantly.</li>
                <li>Sign up one or multiple players for group sessions.</li>
                <li>Get checkout status and paid-signup tracking in app.</li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
