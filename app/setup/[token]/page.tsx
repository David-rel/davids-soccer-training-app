import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Image from "next/image";

import { authOptions } from "@/lib/auth";
import { SetupClient } from "./SetupClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

type SetupData = {
  parent: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  players: Array<{
    id: string;
    name: string;
    age: number | null;
    birthdate: string | null;
    team_level: string | null;
  }>;
};

export default async function SetupPage({ params }: Props) {
  const { token } = await params;

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect("/players");
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/parents/setup/${token}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-emerald-50">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-50 via-white to-white" />
        <main className="relative mx-auto max-w-lg px-6 py-20 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            Link invalid or expired
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            This setup link is no longer valid. Please contact Coach David to
            get a new one.
          </p>
        </main>
      </div>
    );
  }

  const data = (await res.json()) as SetupData;

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-50 via-white to-white" />

      <header className="relative border-b border-emerald-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
          <Image
            src="/icon.png"
            alt="Training app"
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl"
          />
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Welcome to your training portal
            </div>
            <div className="text-xs text-gray-500">
              Set up your account to get started
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Hi{data.parent.name ? `, ${data.parent.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Coach David has set up a training account for you. Create a
            password below to activate it — then you can log in anytime to view
            your player profile and session history.
          </p>
        </div>

        <SetupClient
          token={token}
          parentName={data.parent.name}
          parentEmail={data.parent.email}
          parentPhone={data.parent.phone}
          players={data.players}
        />
      </main>
    </div>
  );
}
