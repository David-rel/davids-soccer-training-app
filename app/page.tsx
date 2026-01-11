import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "@/app/ui/LoginForm";
import Image from "next/image";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/players");

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-50 via-white to-white" />

      <main className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-2">
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-sm">
              <Image
                src="/icon.png"
                alt="David’s Soccer Training icon"
                width={44}
                height={44}
                className="h-11 w-11 rounded-xl"
              />
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  David’s Soccer Training
                </div>
                <div className="text-sm text-gray-600">
                  Private coaching • Player development tracking
                </div>
              </div>
            </div>

            <h1 className="mt-8 text-4xl font-semibold tracking-tight text-gray-900">
              Parent portal
            </h1>
            <p className="mt-3 max-w-lg text-base leading-7 text-gray-600">
              Log in to view and manage your player profiles, focus areas, and
              long-term development notes.
            </p>

            <div className="mt-8 rounded-2xl bg-linear-to-r from-emerald-600 to-emerald-700 p-6 text-white shadow-sm">
              <div className="text-sm font-semibold text-emerald-50">
                How accounts work
              </div>
              <ul className="mt-4 space-y-3 text-sm text-emerald-100">
                <li className="flex gap-3">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-white/90" />
                  <span>
                    You’ll get an account after booking a private 1‑on‑1 with
                    Coach David.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-white/90" />
                  <span>
                    After your private session, please wait up to{" "}
                    <span className="font-semibold text-white">24 hours</span>{" "}
                    for a message confirming your profile has been created.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 flex items-center justify-center lg:hidden">
              <Image
                src="/logo.jpeg"
                alt="David’s Soccer Training"
                width={360}
                height={96}
                className="h-auto w-60"
                priority
              />
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="flex items-start gap-3">
                <Image
                  src="/icon.png"
                  alt="David’s Soccer Training icon"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-2xl"
                />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Parent login
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Email or phone number, plus your password.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <LoginForm />
              </div>

              <div className="mt-6 border-t border-emerald-200 pt-4 text-sm text-gray-600">
                <p>
                  <span className="font-semibold text-gray-900">
                    Need an account?
                  </span>{" "}
                  To get an account, you need to sign up for a private 1‑on‑1
                  with Coach David.
                </p>
                <p className="mt-2">
                  If you already did a private session, please wait{" "}
                  <span className="font-semibold text-gray-900">24 hours</span>{" "}
                  after it’s done for a message from him confirming your profile
                  is created.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
