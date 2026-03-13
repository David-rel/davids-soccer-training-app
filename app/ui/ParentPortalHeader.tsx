import Image from "next/image";
import Link from "next/link";

import { ParentAccountSettings } from "@/app/players/ui/ParentAccountSettings";
import { SignOutButton } from "@/app/ui/SignOutButton";

type Props = {
  title: string;
  subtitle: string;
  isAdmin: boolean;
  email: string | null;
  phone: string | null;
};

export function ParentPortalHeader({
  title,
  subtitle,
  isAdmin,
  email,
  phone,
}: Props) {
  return (
    <header className="relative bg-linear-to-r from-emerald-600 to-emerald-700">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/80">
            <Image
              src="/icon.png"
              alt="David’s Soccer Training icon"
              width={56}
              height={56}
              className="h-14 w-14 rounded-2xl bg-white p-2"
              priority
            />
            <div>
              <div className="text-sm font-semibold text-emerald-50">
                David’s Soccer Training
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-emerald-100 sm:text-base">
                {subtitle}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-emerald-200/30 bg-white/10 px-4 py-2 text-sm text-emerald-50 sm:block">
              Parent portal
            </div>
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                View admin
              </Link>
            )}
            <ParentAccountSettings initialEmail={email} initialPhone={phone} />
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
