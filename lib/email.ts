import "server-only";
import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER || "davidfales523@gmail.com";
const GMAIL_PASS = process.env.GMAIL_PASS || "";
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || "davidfalesct@gmail.com";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    if (!GMAIL_PASS) {
      throw new Error("GMAIL_PASS environment variable is not set");
    }
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });
  }
  return transporter;
}

export type NewContentSubmissionEmailParams = {
  playerName: string;
  playerInfo: string;
  submissionTime: string;
  adminReviewUrl: string;
  description?: string | null;
};

export async function sendNewContentSubmissionEmail(
  params: NewContentSubmissionEmailParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = getTransporter();

    const htmlBody = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">New Video Submission for Review</h2>
        <p style="color: #374151; font-size: 16px;">
          <strong>${params.playerName}</strong> has uploaded a video for your review.
        </p>

        <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; color: #059669; font-weight: 600;">Player Information</p>
          <p style="margin: 0; color: #374151;">${params.playerInfo}</p>
        </div>

        ${
          params.description
            ? `
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-weight: 600; font-size: 14px;">Player's Note:</p>
            <p style="margin: 0; color: #374151; white-space: pre-wrap;">${params.description}</p>
          </div>
        `
            : ""
        }

        <p style="color: #6b7280; font-size: 14px;">
          Submitted at: ${params.submissionTime}
        </p>

        <a href="${params.adminReviewUrl}"
           style="display: inline-block; background: #059669; color: white;
                  padding: 12px 24px; text-decoration: none; border-radius: 8px;
                  font-weight: 600; margin-top: 16px;">
          Review Submission
        </a>
      </div>
    `;

    await transport.sendMail({
      from: `"Davids Private Coaching Video Submission" <${GMAIL_USER}>`,
      to: RECIPIENT_EMAIL,
      subject: `Private Coaching - New Video Upload - ${params.playerName}`,
      html: htmlBody,
    });

    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
