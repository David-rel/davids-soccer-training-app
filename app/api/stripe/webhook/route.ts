import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import nodemailer from "nodemailer";

import {
  getGroupSessionById,
  markPlayerSignupsPaidByCheckoutSession,
} from "@/lib/groupSessions";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
const GROUP_TIME_ZONE = "America/Phoenix";
const PLAYER_DASHBOARD_URL =
  process.env.NEXT_PUBLIC_PLAYER_DASHBOARD_URL ||
  "https://app.davidssoccertraining.com";

function addMinutes(input: string | Date, minutes: number) {
  return new Date(new Date(input).getTime() + minutes * 60_000);
}

function formatSessionDate(input: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: GROUP_TIME_ZONE,
  }).format(new Date(input));
}

function formatSessionTimeRange(startInput: string, endInput: string | null) {
  const start = new Date(startInput);
  const end = endInput ? new Date(endInput) : addMinutes(start, 75);
  const format = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: GROUP_TIME_ZONE,
  });
  return `${format.format(start)} - ${format.format(end)}`;
}

async function sendGroupSignupConfirmationEmail(params: {
  to: string;
  firstName: string;
  playerNames: string[];
  sessionTitle: string;
  sessionDate: string;
  sessionDateEnd: string | null;
  location: string | null;
  receiptUrl: string | null;
  loginEmail: string;
  loginPassword: string | null;
}) {
  const gmailUser = process.env.GMAIL_USER_GROUPS;
  const gmailPass = process.env.GMAIL_PASS_GROUPS;
  if (!gmailUser || !gmailPass) return;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const dateLabel = formatSessionDate(params.sessionDate);
  const timeLabel = formatSessionTimeRange(params.sessionDate, params.sessionDateEnd);

  const mailOptions = {
    from: gmailUser,
    to: params.to,
    subject: `You're signed up: ${params.sessionTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 2px solid #10b981; border-radius: 12px;">
        <h2 style="margin: 0 0 12px; color: #065f46;">Group Session Signup Confirmed</h2>
        <p style="margin: 0 0 16px; color: #1f2937;">Hi ${params.firstName || "there"}, your signup is confirmed.</p>
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px;">
          <p style="margin: 0 0 8px;"><strong>Players:</strong> ${params.playerNames.join(", ")}</p>
          <p style="margin: 0 0 8px;"><strong>Session:</strong> ${params.sessionTitle}</p>
          <p style="margin: 0 0 8px;"><strong>Date:</strong> ${dateLabel}</p>
          <p style="margin: 0 0 8px;"><strong>Time:</strong> ${timeLabel}</p>
          <p style="margin: 0;"><strong>Location:</strong> ${params.location || "TBD"}</p>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-top: 12px;">
          <p style="margin: 0 0 8px;"><strong>Player App:</strong> <a href="${PLAYER_DASHBOARD_URL}" style="color: #047857;">${PLAYER_DASHBOARD_URL}</a></p>
          <p style="margin: 0 0 8px;"><strong>Login email:</strong> ${params.loginEmail}</p>
          ${
            params.loginPassword
              ? `<p style="margin: 0;"><strong>Temporary password:</strong> ${params.loginPassword}</p>`
              : `<p style="margin: 0;">Use your existing password for sign in.</p>`
          }
        </div>
        ${
          params.receiptUrl
            ? `<p style="margin: 16px 0 0;"><a href="${params.receiptUrl}" style="color: #047857;">View Stripe receipt</a></p>`
            : ""
        }
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

async function sendGroupSignupOwnerNotificationEmail(params: {
  to: string;
  playerNames: string[];
  emergencyContact: string;
  contactPhone: string | null;
  contactEmail: string;
  sessionTitle: string;
  sessionDate: string;
  sessionDateEnd: string | null;
  location: string | null;
  receiptUrl: string | null;
  parentPortalUrl: string;
  parentLoginEmail: string;
  parentLoginPassword: string | null;
}) {
  const gmailUser = process.env.GMAIL_USER_GROUPS;
  const gmailPass = process.env.GMAIL_PASS_GROUPS;
  if (!gmailUser || !gmailPass) return;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const dateLabel = formatSessionDate(params.sessionDate);
  const timeLabel = formatSessionTimeRange(params.sessionDate, params.sessionDateEnd);

  const mailOptions = {
    from: gmailUser,
    to: params.to,
    subject: `New group signup: ${params.sessionTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; border: 2px solid #10b981; border-radius: 12px;">
        <h2 style="margin: 0 0 12px; color: #065f46;">New Group Session Signup</h2>
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
          <p style="margin: 0 0 8px;"><strong>Session:</strong> ${params.sessionTitle}</p>
          <p style="margin: 0 0 8px;"><strong>Date:</strong> ${dateLabel}</p>
          <p style="margin: 0 0 8px;"><strong>Time:</strong> ${timeLabel}</p>
          <p style="margin: 0;"><strong>Location:</strong> ${params.location || "TBD"}</p>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px;">
          <p style="margin: 0 0 8px;"><strong>Players:</strong> ${params.playerNames.join(", ")}</p>
          <p style="margin: 0 0 8px;"><strong>Emergency contact:</strong> ${params.emergencyContact}</p>
          <p style="margin: 0 0 8px;"><strong>Contact phone:</strong> ${params.contactPhone || "N/A"}</p>
          <p style="margin: 0;"><strong>Contact email:</strong> ${params.contactEmail}</p>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-top: 14px;">
          <p style="margin: 0 0 8px;"><strong>Parent App URL:</strong> <a href="${params.parentPortalUrl}" style="color: #047857;">${params.parentPortalUrl}</a></p>
          <p style="margin: 0 0 8px;"><strong>Parent app email:</strong> ${params.parentLoginEmail}</p>
          ${
            params.parentLoginPassword
              ? `<p style="margin: 0;"><strong>Parent app password:</strong> ${params.parentLoginPassword}</p>`
              : `<p style="margin: 0;">Existing account reused (password unchanged).</p>`
          }
        </div>
        ${
          params.receiptUrl
            ? `<p style="margin: 16px 0 0;"><a href="${params.receiptUrl}" style="color: #047857;">View Stripe receipt</a></p>`
            : ""
        }
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing Stripe webhook configuration" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;

      const paymentIntentId =
        typeof checkoutSession.payment_intent === "string"
          ? checkoutSession.payment_intent
          : checkoutSession.payment_intent?.id || null;

      let chargeId: string | null = null;
      let receiptUrl: string | null = null;

      if (paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["latest_charge"],
        });

        if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge !== "string") {
          chargeId = paymentIntent.latest_charge.id;
          receiptUrl = paymentIntent.latest_charge.receipt_url || null;
        }
      }

      const paidSignups = await markPlayerSignupsPaidByCheckoutSession(checkoutSession.id, {
        paymentIntentId,
        chargeId,
        receiptUrl,
      });

      const metadata = checkoutSession.metadata || {};
      const metadataLoginEmail = (metadata.parent_portal_email || "").trim();
      const metadataLoginPassword = (metadata.parent_portal_password || "").trim();
      const primarySignup = paidSignups[0];
      const loginEmail = metadataLoginEmail || primarySignup?.contact_email || "";
      const loginPassword = metadataLoginPassword || null;

      if (primarySignup?.contact_email) {
        const session = await getGroupSessionById(primarySignup.group_session_id);
        if (session) {
          const playerNames = paidSignups.map((signup) =>
            `${signup.first_name} ${signup.last_name}`.trim()
          );
          try {
            await sendGroupSignupConfirmationEmail({
              to: primarySignup.contact_email,
              firstName: primarySignup.first_name,
              playerNames,
              sessionTitle: session.title,
              sessionDate: session.session_date,
              sessionDateEnd: session.session_date_end,
              location: session.location,
              receiptUrl,
              loginEmail,
              loginPassword,
            });
          } catch (emailError) {
            console.error("Failed to send group signup confirmation email", emailError);
          }

          const ownerAlertEmail =
            process.env.GROUP_SIGNUP_ALERT_EMAIL ||
            process.env.GMAIL_USER_GROUPS ||
            "davidfalesct@gmail.com";

          try {
            await sendGroupSignupOwnerNotificationEmail({
              to: ownerAlertEmail,
              playerNames,
              emergencyContact: primarySignup.emergency_contact,
              contactPhone: primarySignup.contact_phone,
              contactEmail: primarySignup.contact_email,
              sessionTitle: session.title,
              sessionDate: session.session_date,
              sessionDateEnd: session.session_date_end,
              location: session.location,
              receiptUrl,
              parentPortalUrl: PLAYER_DASHBOARD_URL,
              parentLoginEmail: loginEmail,
              parentLoginPassword: loginPassword,
            });
          } catch (ownerEmailError) {
            console.error("Failed to send group signup owner alert email", ownerEmailError);
          }
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Stripe webhook handling error", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
