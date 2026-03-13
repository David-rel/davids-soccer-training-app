import Image from "next/image";
import Link from "next/link";

type Props = {
  callbackUrl?: string;
};

export function PublicSiteHeader({ callbackUrl = "/players" }: Props) {
  const encodedCallback = encodeURIComponent(callbackUrl);

  return (
    <header className="relative bg-linear-to-r from-emerald-600 to-emerald-700">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/80">
            <Image
              src="/icon.png"
              alt="David’s Soccer Training icon"
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl bg-white p-1.5"
              priority
            />
            <div>
              <div className="text-sm font-semibold text-emerald-50">
                David’s Soccer Training
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Group Sessions
              </h1>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/players"
              className="rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              View player profile
            </Link>
            <Link
              href={`/login?callbackUrl=${encodedCallback}`}
              className="rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Log in
            </Link>
            <Link
              href={`/signup?callbackUrl=${encodedCallback}`}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
