import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { del, put } from "@vercel/blob";

import { sql } from "@/db";
import { authOptions } from "@/lib/auth";
import { normalizePhoneForStorage } from "@/lib/phone";
import {
  normalizeComparableName,
  PRIVATE_TRAINING_WAIVER_DOCUMENT,
} from "@/lib/signedDocuments";
import { sendSmsViaTwilio } from "@/lib/twilio";
import { buildSignedWaiverPdf } from "@/lib/waiverPdf";

type CreateSignedDocumentBody = {
  playerId?: string | null;
  playerName?: string;
  playerBirthdate?: string | null;
  parentGuardianName?: string;
  phoneNumber?: string | null;
  emergencyContact?: string;
  typedSignatureName?: string;
  signatureDate?: string | null;
  agreementAccepted?: boolean;
};

type ParentRow = {
  id: string;
  name: string | null;
  phone: string | null;
};

type PlayerRow = {
  id: string;
  name: string;
  birthdate: string | null;
};

function cleanText(input: unknown) {
  return (input || "").toString().trim();
}

function cleanNullable(input: unknown) {
  const value = cleanText(input);
  return value || null;
}

function parseDateInput(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return value;
}

function getForwardedIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return null;
  const [firstIp] = forwardedFor.split(",");
  const cleaned = (firstIp || "").trim();
  return cleaned || null;
}

function toFileToken(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "player";
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const parentId = session?.user?.id ?? null;
    const body = (await request.json().catch(() => null)) as CreateSignedDocumentBody | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (body.agreementAccepted !== true) {
      return NextResponse.json(
        { error: "You must accept the agreement before signing." },
        { status: 400 }
      );
    }

    const requestedPlayerId = cleanNullable(body.playerId);
    let playerId: string | null = null;
    let playerName = cleanText(body.playerName);
    let playerBirthdate = parseDateInput(cleanNullable(body.playerBirthdate));

    let parentName = cleanText(body.parentGuardianName);
    let phoneNumber = normalizePhoneForStorage(body.phoneNumber || "");
    const emergencyContact = cleanText(body.emergencyContact);
    const typedSignatureName = cleanText(body.typedSignatureName);
    const signatureDate = parseDateInput(cleanNullable(body.signatureDate));

    if (parentId) {
      const parentRows = (await sql`
        SELECT id, name, phone
        FROM parents
        WHERE id = ${parentId}
        LIMIT 1
      `) as unknown as ParentRow[];
      const parent = parentRows[0];
      if (!parent) {
        return NextResponse.json({ error: "Parent account not found." }, { status: 404 });
      }

      if (!parentName) {
        parentName = cleanText(parent.name);
      }

      if (!phoneNumber) {
        phoneNumber = normalizePhoneForStorage(parent.phone || "");
      }
    }

    if (requestedPlayerId) {
      if (!parentId) {
        return NextResponse.json(
          { error: "Player profile selection requires a logged-in parent account." },
          { status: 401 }
        );
      }

      const playerRows = (await sql`
        SELECT id, name, birthdate::text AS birthdate
        FROM players
        WHERE id = ${requestedPlayerId}
          AND parent_id = ${parentId}
        LIMIT 1
      `) as unknown as PlayerRow[];

      const player = playerRows[0];
      if (!player) {
        return NextResponse.json({ error: "Player profile not found." }, { status: 404 });
      }

      playerId = player.id;
      playerName = player.name;
      playerBirthdate = player.birthdate;
    }

    if (!playerName) {
      return NextResponse.json({ error: "Player name is required." }, { status: 400 });
    }
    if (!playerBirthdate) {
      return NextResponse.json({ error: "Player date of birth is required." }, { status: 400 });
    }
    if (!parentName) {
      return NextResponse.json(
        { error: "Parent/guardian name is required." },
        { status: 400 }
      );
    }
    if (!emergencyContact) {
      return NextResponse.json({ error: "Emergency contact is required." }, { status: 400 });
    }
    if (!typedSignatureName) {
      return NextResponse.json(
        { error: "Typed signature name is required." },
        { status: 400 }
      );
    }
    if (!signatureDate) {
      return NextResponse.json({ error: "Signature date is required." }, { status: 400 });
    }

    if (
      normalizeComparableName(typedSignatureName) !==
      normalizeComparableName(parentName)
    ) {
      return NextResponse.json(
        {
          error:
            "Typed signature must match the parent/guardian name exactly.",
        },
        { status: 400 }
      );
    }

    const userAgent = cleanNullable(request.headers.get("user-agent"));
    const ipAddress = getForwardedIp(request);

    let signedBlobUrl = "";
    let signedBlobKey = "";
    try {
      const signedPdfBytes = await buildSignedWaiverPdf({
        playerName,
        playerBirthdate,
        parentGuardianName: parentName,
        phoneNumber,
        emergencyContact,
        typedSignatureName,
        signatureDate,
      });

      const playerToken = toFileToken(playerName);
      signedBlobKey = `waivers/${signatureDate}-${playerToken}-${crypto.randomUUID()}.pdf`;
      const signedBlob = await put(signedBlobKey, Buffer.from(signedPdfBytes), {
        access: "public",
        contentType: "application/pdf",
      });
      signedBlobUrl = signedBlob.url;
    } catch (error) {
      console.error("Failed to generate or upload signed waiver PDF", error);
      const message =
        error instanceof Error ? error.message : "Unknown PDF generation error";
      return NextResponse.json(
        {
          error: `Could not generate signed waiver document: ${message}`,
        },
        { status: 502 }
      );
    }

    const insertedRows = (await sql`
      INSERT INTO signed_documents (
        document_key,
        document_title,
        document_url,
        parent_id,
        player_id,
        player_name,
        player_birthdate,
        parent_guardian_name,
        phone_number,
        emergency_contact,
        typed_signature_name,
        signature_date,
        ip_address,
        user_agent,
        signed_document_url,
        signed_blob_key
      )
      VALUES (
        ${PRIVATE_TRAINING_WAIVER_DOCUMENT.key},
        ${PRIVATE_TRAINING_WAIVER_DOCUMENT.title},
        ${PRIVATE_TRAINING_WAIVER_DOCUMENT.url},
        ${parentId},
        ${playerId},
        ${playerName},
        ${playerBirthdate}::date,
        ${parentName},
        ${phoneNumber},
        ${emergencyContact},
        ${typedSignatureName},
        ${signatureDate}::date,
        ${ipAddress},
        ${userAgent},
        ${signedBlobUrl},
        ${signedBlobKey}
      )
      RETURNING id, created_at::text AS created_at
    `) as unknown as Array<{ id: string; created_at: string }>;

    const inserted = insertedRows[0];
    if (!inserted) {
      try {
        await del(signedBlobUrl);
      } catch (deleteError) {
        console.error(
          "Failed to delete uploaded waiver blob after insert failure",
          deleteError
        );
      }
      return NextResponse.json({ error: "Could not save signed document." }, { status: 500 });
    }

    const signedDocumentAlertPhone =
      String(process.env.SIGNED_DOCUMENT_ALERT_TO_PHONE ?? "").trim() ||
      String(process.env.BIRTHDAY_ALERT_TO_PHONE ?? "").trim() ||
      "7206122979";
    const signedDateLabel = new Date(`${signatureDate}T12:00:00.000Z`).toLocaleDateString(
      "en-US",
      { timeZone: "America/Phoenix", year: "numeric", month: "long", day: "numeric" }
    );
    const smsBody = `Waiver signed: ${parentName} signed the 1-on-1 private training contract for ${playerName} on ${signedDateLabel}.`;
    try {
      console.info(
        `[signed-documents] Sending SMS for ${inserted.id} to ${signedDocumentAlertPhone}`
      );
      const smsResult = await sendSmsViaTwilio(smsBody, {
        to: signedDocumentAlertPhone,
      });
      console.info(
        `[signed-documents] SMS sent for ${inserted.id}: sid=${smsResult.sid} status=${smsResult.status ?? "unknown"}`
      );
    } catch (error) {
      console.error("Failed to send signed-document SMS alert", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown SMS error";

      // Keep data consistent with the "all steps must finish before success" requirement.
      try {
        await sql`DELETE FROM signed_documents WHERE id = ${inserted.id}`;
      } catch (deleteError) {
        console.error(
          "Failed to rollback signed document after SMS failure",
          deleteError
        );
      }
      try {
        await del(signedBlobUrl);
      } catch (blobDeleteError) {
        console.error(
          "Failed to delete uploaded waiver blob after SMS failure",
          blobDeleteError
        );
      }

      return NextResponse.json(
        {
          error: `Could not send confirmation text message: ${errorMessage}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        id: inserted.id,
        createdAt: inserted.created_at,
        signedDocumentUrl: signedBlobUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to save signed document", error);
    return NextResponse.json(
      { error: "Failed to save signed document." },
      { status: 500 }
    );
  }
}
