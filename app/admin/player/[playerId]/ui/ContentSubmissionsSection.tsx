"use client";

import { useRef, useState, useTransition } from "react";

type PlayerVideoUpload = {
  id: string;
  player_id: string;
  video_url: string;
  description: string | null;
  status: "pending" | "reviewed";
  upload_month: string;
  coach_video_response_url: string | null;
  coach_document_response_url: string | null;
  coach_response_description: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  playerId: string;
  submissions: PlayerVideoUpload[];
  onReload: () => void;
};

export function ContentSubmissionsSection({
  playerId,
  submissions,
  onReload,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Review form state per submission
  const [reviewForms, setReviewForms] = useState<
    Record<
      string,
      {
        videoUrl: string;
        documentUrl: string;
        description: string;
        uploadingVideo: boolean;
        uploadingDocument: boolean;
      }
    >
  >({});

  const videoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const documentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getFormState = (uploadId: string) => {
    if (!reviewForms[uploadId]) {
      return {
        videoUrl: "",
        documentUrl: "",
        description: "",
        uploadingVideo: false,
        uploadingDocument: false,
      };
    }
    return reviewForms[uploadId];
  };

  const updateFormState = (
    uploadId: string,
    updates: Partial<(typeof reviewForms)[string]>
  ) => {
    setReviewForms((prev) => ({
      ...prev,
      [uploadId]: { ...getFormState(uploadId), ...updates },
    }));
  };

  const handleVideoUpload = async (uploadId: string, file: File) => {
    setError(null);
    updateFormState(uploadId, { uploadingVideo: true });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/blob/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Video upload failed");
      }

      const data = (await res.json()) as { url: string };
      updateFormState(uploadId, { videoUrl: data.url, uploadingVideo: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      updateFormState(uploadId, { uploadingVideo: false });
    }
  };

  const handleDocumentUpload = async (uploadId: string, file: File) => {
    setError(null);
    updateFormState(uploadId, { uploadingDocument: true });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/blob/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Document upload failed");
      }

      const data = (await res.json()) as { url: string };
      updateFormState(uploadId, {
        documentUrl: data.url,
        uploadingDocument: false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      updateFormState(uploadId, { uploadingDocument: false });
    }
  };

  const submitReview = (uploadId: string) => {
    setError(null);
    setSuccess(null);

    const form = getFormState(uploadId);

    if (!form.videoUrl && !form.documentUrl && !form.description.trim()) {
      setError(
        "Please provide at least one response (video, document, or description)"
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/players/${playerId}/content/${uploadId}/review`,
          {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              coach_video_response_url: form.videoUrl || null,
              coach_document_response_url: form.documentUrl || null,
              coach_response_description: form.description.trim() || null,
            }),
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to submit review");
        }

        setSuccess("Review submitted successfully!");
        setExpandedId(null);

        // Clear form
        setReviewForms((prev) => {
          const next = { ...prev };
          delete next[uploadId];
          return next;
        });

        // Reload data
        onReload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit review");
      }
    });
  };

  const pending = submissions.filter((s) => s.status === "pending");
  const reviewed = submissions.filter((s) => s.status === "reviewed");

  return (
    <div id="content-submissions" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Content Submissions
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Review player-uploaded videos and provide feedback
        </p>
      </div>

      {(error || success) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || success}
        </div>
      )}

      {/* Pending Submissions */}
      {pending.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Pending ({pending.length})
          </h3>
          <div className="space-y-4">
            {pending.map((submission) => {
              const form = getFormState(submission.id);
              const isExpanded = expandedId === submission.id;

              return (
                <div
                  key={submission.id}
                  className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4"
                >
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Submitted{" "}
                        {new Date(submission.created_at).toLocaleString()}
                      </p>
                      {submission.description && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                          {submission.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : submission.id)
                      }
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      {isExpanded ? "Collapse" : "Review"}
                    </button>
                  </div>

                  {/* Player Video */}
                  <video
                    src={submission.video_url}
                    controls
                    className="mb-4 w-full rounded-xl"
                    style={{ maxHeight: "400px" }}
                  />

                  {/* Review Form */}
                  {isExpanded && (
                    <div className="space-y-4 rounded-xl border border-emerald-200 bg-white p-4">
                      <h4 className="font-semibold text-gray-900">
                        Submit Review
                      </h4>

                      {/* Video Response */}
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Video Response
                        </label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={form.videoUrl}
                            onChange={(e) =>
                              updateFormState(submission.id, {
                                videoUrl: e.target.value,
                              })
                            }
                            placeholder="Enter YouTube/Loom URL or upload file below"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                          />
                          <input
                            ref={(el) => {
                              videoInputRefs.current[submission.id] = el;
                            }}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleVideoUpload(submission.id, file);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              videoInputRefs.current[submission.id]?.click()
                            }
                            disabled={form.uploadingVideo}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                          >
                            {form.uploadingVideo
                              ? "Uploading..."
                              : "Upload Video File"}
                          </button>
                        </div>
                      </div>

                      {/* Document Response */}
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Document Response
                        </label>
                        <input
                          ref={(el) => {
                            documentInputRefs.current[submission.id] = el;
                          }}
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              handleDocumentUpload(submission.id, file);
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              documentInputRefs.current[submission.id]?.click()
                            }
                            disabled={form.uploadingDocument}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                          >
                            {form.uploadingDocument
                              ? "Uploading..."
                              : "Upload Document"}
                          </button>
                          {form.documentUrl && (
                            <span className="text-xs text-emerald-600">
                              Document uploaded
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Text Description */}
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          value={form.description}
                          onChange={(e) =>
                            updateFormState(submission.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Written feedback for the player..."
                          rows={4}
                          className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                        />
                      </div>

                      {/* Submit */}
                      <button
                        type="button"
                        onClick={() => submitReview(submission.id)}
                        disabled={
                          isPending ||
                          form.uploadingVideo ||
                          form.uploadingDocument
                        }
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {isPending ? "Submitting..." : "Submit Review"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviewed Submissions */}
      {reviewed.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Reviewed ({reviewed.length})
          </h3>
          <div className="space-y-4">
            {reviewed.map((submission) => (
              <div
                key={submission.id}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  Submitted {new Date(submission.created_at).toLocaleString()}
                </p>
                {submission.description && (
                  <p className="mb-3 text-sm text-gray-600">
                    {submission.description}
                  </p>
                )}

                <video
                  src={submission.video_url}
                  controls
                  className="mb-4 w-full rounded-xl"
                  style={{ maxHeight: "300px" }}
                />

                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-emerald-800">
                    YOUR RESPONSE
                  </p>
                  {submission.coach_response_description && (
                    <p className="mb-2 whitespace-pre-wrap text-sm text-gray-700">
                      {submission.coach_response_description}
                    </p>
                  )}
                  {submission.coach_video_response_url && (
                    <p className="text-xs text-gray-600">
                      Video:{" "}
                      <a
                        href={submission.coach_video_response_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 underline"
                      >
                        View
                      </a>
                    </p>
                  )}
                  {submission.coach_document_response_url && (
                    <p className="text-xs text-gray-600">
                      Document:{" "}
                      <a
                        href={submission.coach_document_response_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 underline"
                      >
                        Download
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {submissions.length === 0 && (
        <p className="text-sm text-gray-600">No submissions yet.</p>
      )}
    </div>
  );
}
