import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { PRIVATE_TRAINING_WAIVER_DOCUMENT } from "@/lib/signedDocuments";

type BuildSignedWaiverPdfArgs = {
  playerName: string;
  playerBirthdate: string;
  parentGuardianName: string;
  phoneNumber: string | null;
  emergencyContact: string;
  typedSignatureName: string;
  signatureDate: string;
};

function formatDateLabel(input: string) {
  const parsed = new Date(`${input}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return input;
  return parsed.toLocaleDateString("en-US", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function buildSignedWaiverPdf(
  args: BuildSignedWaiverPdfArgs
): Promise<Uint8Array> {
  const response = await fetch(PRIVATE_TRAINING_WAIVER_DOCUMENT.url, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load waiver template PDF (${response.status}).`);
  }

  const templateBytes = await response.arrayBuffer();
  const pdf = await PDFDocument.load(templateBytes);
  const pages = pdf.getPages();
  if (pages.length === 0) {
    throw new Error("Waiver template PDF has no pages.");
  }

  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.08, 0.12, 0.2);

  const firstPage = pages[0];
  firstPage.drawText(args.playerName, {
    x: 210,
    y: 518,
    size: 11,
    font: helveticaBold,
    color: ink,
  });
  firstPage.drawText(args.playerBirthdate, {
    x: 210,
    y: 500,
    size: 11,
    font: helvetica,
    color: ink,
  });
  firstPage.drawText(args.parentGuardianName, {
    x: 210,
    y: 482,
    size: 11,
    font: helvetica,
    color: ink,
  });
  firstPage.drawText(args.phoneNumber || "N/A", {
    x: 210,
    y: 464,
    size: 11,
    font: helvetica,
    color: ink,
  });
  firstPage.drawText(args.emergencyContact, {
    x: 210,
    y: 446,
    size: 11,
    font: helvetica,
    color: ink,
  });

  const finalPage = pages[pages.length - 1];
  finalPage.drawText(args.playerName, {
    x: 150,
    y: 596,
    size: 12,
    font: helvetica,
    color: ink,
  });
  finalPage.drawText(args.parentGuardianName, {
    x: 215,
    y: 566,
    size: 12,
    font: helvetica,
    color: ink,
  });
  finalPage.drawText(args.typedSignatureName, {
    x: 255,
    y: 534,
    size: 12,
    font: helveticaBold,
    color: ink,
  });
  finalPage.drawText(formatDateLabel(args.signatureDate), {
    x: 120,
    y: 503,
    size: 12,
    font: helvetica,
    color: ink,
  });

  return pdf.save();
}
