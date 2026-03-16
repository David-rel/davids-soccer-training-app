import Link from "next/link";

import { sql } from "@/db";

import AdminWaiversClient from "./ui/AdminWaiversClient";

export const dynamic = "force-dynamic";

type WaiverRow = {
  id: string;
  player_name: string;
  player_birthdate: string | null;
  parent_guardian_name: string;
  phone_number: string | null;
  emergency_contact: string;
  signature_date: string;
  created_at: string;
  signed_document_url: string | null;
};

export default async function AdminWaiversPage() {
  const rows = (await sql`
    SELECT
      sd.id::text AS id,
      sd.player_name,
      sd.player_birthdate::text AS player_birthdate,
      sd.parent_guardian_name,
      sd.phone_number,
      sd.emergency_contact,
      sd.signature_date::text AS signature_date,
      sd.created_at::text AS created_at,
      sd.signed_document_url
    FROM signed_documents sd
    ORDER BY sd.created_at DESC
    LIMIT 2000
  `) as unknown as WaiverRow[];

  const waivers = rows.map((row) => ({
    id: row.id,
    playerName: row.player_name,
    playerBirthdate: row.player_birthdate,
    parentGuardianName: row.parent_guardian_name,
    phoneNumber: row.phone_number,
    emergencyContact: row.emergency_contact,
    signatureDate: row.signature_date,
    createdAt: row.created_at,
    signedDocumentUrl: row.signed_document_url,
  }));

  return (
    <div className="min-h-screen bg-emerald-50">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Waivers</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review all signed private-training waiver records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/videos"
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
            >
              Videos
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300"
            >
              Back to admin
            </Link>
          </div>
        </div>

        <AdminWaiversClient waivers={waivers} />
      </main>
    </div>
  );
}
