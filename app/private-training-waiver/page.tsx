import Link from "next/link";
import { getServerSession } from "next-auth";

import WaiverSigningForm from "@/app/private-training-waiver/WaiverSigningForm";
import { ParentPortalHeader } from "@/app/ui/ParentPortalHeader";
import { PublicSiteHeader } from "@/app/ui/PublicSiteHeader";
import { sql } from "@/db";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ParentRow = {
  email: string | null;
  phone: string | null;
  name: string | null;
  is_admin: boolean;
};

type PlayerRow = {
  id: string;
  name: string;
  birthdate: string | null;
};

export default async function PrivateTrainingWaiverPage() {
  const authSession = await getServerSession(authOptions);
  const parentId = authSession?.user?.id ?? null;

  let parent: ParentRow = {
    email: null,
    phone: null,
    name: null,
    is_admin: false,
  };

  let players: PlayerRow[] = [];

  if (parentId) {
    const parentRows = (await sql`
      SELECT email, phone, name, is_admin
      FROM parents
      WHERE id = ${parentId}
      LIMIT 1
    `) as unknown as ParentRow[];
    parent = parentRows[0] ?? parent;

    players = (await sql`
      SELECT id, name, birthdate::text AS birthdate
      FROM players
      WHERE parent_id = ${parentId}
      ORDER BY created_at ASC
    `) as unknown as PlayerRow[];
  }

  const callbackUrl = "/private-training-waiver";

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-emerald-50">
      {parentId ? (
        <ParentPortalHeader
          title="1 on 1 Waiver"
          subtitle="Review the waiver, then sign with your typed name."
          isAdmin={parent.is_admin}
          email={parent.email}
          phone={parent.phone}
        />
      ) : (
        <PublicSiteHeader callbackUrl={callbackUrl} />
      )}

      <section className="px-6 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <Link
            href={parentId ? "/players" : "/"}
            className="inline-flex items-center text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
          >
            {parentId ? "← Back to player portal" : "← Back to homepage"}
          </Link>

          <div className="mt-6 mb-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
              1 on 1 Private Soccer Training Agreement and Liability Waiver
            </h1>
            <p className="mt-3 text-sm text-gray-600">
              Complete the participant information, review the full agreement
              PDF, and sign by typing your legal name.
            </p>
          </div>

          <WaiverSigningForm
            playerOptions={players}
            defaultParentName={parent.name ?? ""}
            defaultPhone={parent.phone ?? ""}
          />
        </div>
      </section>
    </div>
  );
}
