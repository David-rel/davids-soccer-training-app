"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { PRIVATE_TRAINING_WAIVER_DOCUMENT } from "@/lib/signedDocuments";

type PlayerOption = {
  id: string;
  name: string;
  birthdate: string | null;
};

type Props = {
  playerOptions: PlayerOption[];
  defaultParentName: string;
  defaultPhone: string;
};

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function WaiverSigningForm({
  playerOptions,
  defaultParentName,
  defaultPhone,
}: Props) {
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerBirthdate, setPlayerBirthdate] = useState("");
  const [parentGuardianName, setParentGuardianName] = useState(defaultParentName);
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [emergencyContact, setEmergencyContact] = useState(defaultParentName);
  const [typedSignatureName, setTypedSignatureName] = useState("");
  const [signatureDate, setSignatureDate] = useState(todayIsoDate());
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successModal, setSuccessModal] = useState<{
    id: string | null;
    signedDocumentUrl: string | null;
  } | null>(null);

  const selectedPlayer = useMemo(
    () => playerOptions.find((player) => player.id === selectedPlayerId) || null,
    [playerOptions, selectedPlayerId]
  );

  useEffect(() => {
    if (!selectedPlayer) return;
    setPlayerName(selectedPlayer.name);
    setPlayerBirthdate(selectedPlayer.birthdate || "");
  }, [selectedPlayer]);

  const resetForm = () => {
    setSelectedPlayerId("");
    setPlayerName("");
    setPlayerBirthdate("");
    setParentGuardianName(defaultParentName);
    setPhoneNumber(defaultPhone);
    setEmergencyContact(defaultParentName);
    setTypedSignatureName("");
    setSignatureDate(todayIsoDate());
    setAgreementAccepted(false);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!playerName.trim()) {
      setError("Player name is required.");
      return;
    }
    if (!playerBirthdate) {
      setError("Player date of birth is required.");
      return;
    }
    if (!parentGuardianName.trim()) {
      setError("Parent/guardian name is required.");
      return;
    }
    if (!emergencyContact.trim()) {
      setError("Emergency contact is required.");
      return;
    }
    if (!typedSignatureName.trim()) {
      setError("Typed signature name is required.");
      return;
    }
    if (!agreementAccepted) {
      setError("You must accept the agreement before signing.");
      return;
    }

    setError("");
    setSuccessModal(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/signed-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayerId || null,
          playerName: playerName.trim(),
          playerBirthdate,
          parentGuardianName: parentGuardianName.trim(),
          phoneNumber: phoneNumber.trim(),
          emergencyContact: emergencyContact.trim(),
          typedSignatureName: typedSignatureName.trim(),
          signatureDate,
          agreementAccepted,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; id?: string; signedDocumentUrl?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error || "Could not save signed waiver.");
        return;
      }

      resetForm();
      setSuccessModal({
        id: payload?.id ?? null,
        signedDocumentUrl: payload?.signedDocumentUrl ?? null,
      });
    } catch {
      setError("Could not save signed waiver.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm md:p-8"
      >
      <h2 className="text-3xl font-bold text-gray-900">
        1. Participant Information
      </h2>

      {playerOptions.length > 0 ? (
        <label className="mt-6 block">
          <span className="text-sm font-semibold text-gray-700">
            Select player profile (optional)
          </span>
          <select
            value={selectedPlayerId}
            onChange={(event) => setSelectedPlayerId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-emerald-500"
          >
            <option value="">Enter player manually</option>
            {playerOptions.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Player name *</span>
          <input
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Date of birth *</span>
          <input
            type="date"
            value={playerBirthdate}
            onChange={(event) => setPlayerBirthdate(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Parent/guardian name *
          </span>
          <input
            value={parentGuardianName}
            onChange={(event) => setParentGuardianName(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Phone number</span>
          <input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-gray-700">Emergency contact *</span>
          <input
            value={emergencyContact}
            onChange={(event) => setEmergencyContact(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-emerald-500"
          />
        </label>
      </div>

      <div className="my-10 border-t border-gray-300" />

      <h2 className="text-3xl font-bold text-gray-900">
        2. Agreement and Liability Waiver
      </h2>
      <p className="mt-3 text-sm text-gray-600">
        Read the full document below. You can also open it in a new tab if needed.
      </p>
      <p className="mt-2">
        <a
          href={PRIVATE_TRAINING_WAIVER_DOCUMENT.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-emerald-700 underline underline-offset-2"
        >
          Open PDF in new tab
        </a>
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-200">
        <iframe
          title={PRIVATE_TRAINING_WAIVER_DOCUMENT.title}
          src={PRIVATE_TRAINING_WAIVER_DOCUMENT.url}
          className="h-[720px] w-full bg-white"
        />
      </div>

      <div className="my-10 border-t border-gray-300" />

      <h2 className="text-3xl font-bold text-gray-900">
        3. Parent / Guardian Acknowledgment
      </h2>
      <p className="mt-4 text-gray-700">
        By signing below, the parent or legal guardian confirms they have read and
        understood this agreement and accept the liability waiver and policies.
      </p>

      <div className="mt-6 space-y-3 text-gray-900">
        <p>
          <span className="font-semibold">Player Name:</span>{" "}
          {playerName || "—"}
        </p>
        <p>
          <span className="font-semibold">Parent / Guardian Name:</span>{" "}
          {parentGuardianName || "—"}
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Typed signature (full legal name) *
          </span>
          <input
            value={typedSignatureName}
            onChange={(event) => setTypedSignatureName(event.target.value)}
            required
            placeholder="Must match parent/guardian name"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Date *</span>
          <input
            type="date"
            value={signatureDate}
            onChange={(event) => setSignatureDate(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-emerald-500"
          />
        </label>
      </div>

      <label className="mt-6 flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <input
          type="checkbox"
          checked={agreementAccepted}
          onChange={(event) => setAgreementAccepted(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          required
        />
        <span className="text-sm text-gray-700">
          I confirm this typed name serves as my legal signature and I agree to the{" "}
          <a
            href={PRIVATE_TRAINING_WAIVER_DOCUMENT.url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-emerald-700 underline underline-offset-2"
          >
            1 on 1 Private Soccer Training Agreement and Liability Waiver
          </a>
          .
        </span>
      </label>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6">
        <button
          type="submit"
          disabled={isSubmitting || !agreementAccepted}
          className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving signature..." : "Sign and Save Agreement"}
        </button>
      </div>
      </form>

      {successModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">Waiver Signed</h3>
            <p className="mt-2 text-sm text-gray-700">
              Submission is complete and your signed waiver document has been generated.
            </p>
            {successModal.id ? (
              <p className="mt-3 text-xs text-gray-500">Record ID: {successModal.id}</p>
            ) : null}
            {successModal.signedDocumentUrl ? (
              <a
                href={successModal.signedDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-semibold text-emerald-700 underline underline-offset-2"
              >
                View signed PDF
              </a>
            ) : null}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setSuccessModal(null)}
                className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
