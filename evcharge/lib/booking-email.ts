import nodemailer from "nodemailer";
import type { IBooking } from "@/models/Booking";
import User from "@/models/User";
import Station from "@/models/Station";

type MailTransporter = nodemailer.Transporter;

declare global {
    var bookingMailTransporter: MailTransporter | undefined;
}

function getMailTransporter(): MailTransporter {
    const user = process.env.GMAIL_SMTP_USER;
    const pass = process.env.GMAIL_SMTP_PASS;

    if (!user || !pass) {
        throw new Error("Gmail SMTP credentials are not configured");
    }

    if (!global.bookingMailTransporter) {
        global.bookingMailTransporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user, pass },
        });
    }

    return global.bookingMailTransporter;
}

function formatDateTime(value: Date | string): string {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-LK", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Colombo",
    }).format(date);
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function buildBookingConfirmationHtml(params: {
    name: string;
    bookingId: string;
    stationName: string;
    city: string;
    address?: string;
    start: string;
    end: string;
    durationHours: number;
    amount: string;
    mapLink: string;
}): string {
    const {
        name,
        bookingId,
        stationName,
        city,
        address,
        start,
        end,
        durationHours,
        amount,
        mapLink,
    } = params;
    const row = (label: string, value: string) => `
        <tr>
            <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:13px;color:#6b7280;width:38%;vertical-align:top;">
                ${label}
            </td>
            <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;color:#111827;font-weight:600;vertical-align:top;">
                ${value}
            </td>
        </tr>`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;">
        <tr>
            <td align="center" style="padding:24px 12px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border:1px solid #d1d5db;border-radius:16px;overflow:hidden;background-color:#ffffff;box-shadow:0 8px 24px rgba(17,24,39,0.08);">
                    <tr>
                        <td style="background-color:#16a34a;padding:28px 24px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:24px;font-weight:800;line-height:1;color:#ffffff;">
                                        <span style="color:#bbf7d0;">Charge</span><span style="color:#ffffff;">X</span>
                                    </td>
                                    <td align="right" style="vertical-align:middle;">
                                        <span style="display:inline-block;background-color:#15803d;color:#ffffff;border-radius:999px;padding:6px 10px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:12px;font-weight:700;">
                                            &#10003; Confirmed
                                        </span>
                                    </td>
                                </tr>
                            </table>
                            <h1 style="margin:16px 0 0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:30px;font-weight:800;line-height:1.2;color:#ffffff;">
                                Booking Confirmed
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 24px;">
                            <p style="margin:0 0 14px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;font-weight:600;line-height:1.5;color:#111827;">
                                Hi ${name},
                            </p>
                            <p style="margin:0 0 24px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.7;color:#374151;">
                                Your charging slot has been successfully reserved. Your payment is complete and your session is ready.
                            </p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:14px;">
                                <tr>
                                    <td style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#16a34a;font-weight:700;">
                                        Booking details
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                                ${row("Booking ID", bookingId)}
                                ${row("Station Name", stationName)}
                                ${row("City", city)}
                                ${address ? row("Address", address) : ""}
                                ${row("Start Time", start)}
                                ${row("End Time", end)}
                                ${row("Duration", `${durationHours} hour(s)`)}
                                ${row("Amount paid", `LKR ${amount}`)}
                                ${row("Payment Status", `<span style="color:#166534;font-size:14px;font-weight:700;line-height:1.4;">Paid</span>`)}
                            </table>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                                <tr>
                                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#16a34a;font-weight:700;">
                                        Station map
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding:16px 14px;background-color:#f9fafb;">
                                        <a href="${mapLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#16a34a;color:#ffffff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:13px;font-weight:700;line-height:1;text-decoration:none;padding:10px 14px;border-radius:999px;">
                                            View on Map
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:22px 0 0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.7;color:#374151;">
                                Thank you for choosing ChargeX.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 24px 26px;border-top:1px solid #e5e7eb;background-color:#ffffff;">
                            <p style="margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;">
                                This is an automated message. Please keep this email for your records.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function buildMapData(params: {
    stationName: string;
    city: string;
    latitude?: number;
    longitude?: number;
}): { mapLink: string; mapImageUrl?: string } {
    const { stationName, city, latitude, longitude } = params;

    if (typeof latitude === "number" && typeof longitude === "number") {
        const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        return { mapLink };
    }

    const textQuery = `${stationName}, ${city}`;
    return {
        mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(textQuery)}`,
    };
}

export async function sendBookingConfirmationEmail(booking: IBooking): Promise<void> {
    const user = await User.findById(booking.userId).select("name email");
    if (!user?.email) {
        console.warn(
            `Booking confirmation email skipped: user email not found for booking ${booking._id}`
        );
        return;
    }

    const transporter = getMailTransporter();
    const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_SMTP_USER!;
    const bookingId = booking._id.toString();
    const amount = Number(booking.amount || 0).toFixed(2);
    const station = await Station.findById(booking.stationId)
        .select("location address")
        .lean<{ location?: { latitude?: number; longitude?: number }; address?: string }>();
    const mapData = buildMapData({
        stationName: booking.stationName,
        city: booking.city,
        latitude: station?.location?.latitude,
        longitude: station?.location?.longitude,
    });

    const text = [
        `Hi ${user.name || "there"},`,
        "",
        "Your ChargeX booking is confirmed.",
        `Booking ID: ${bookingId}`,
        `Station: ${booking.stationName}`,
        `City: ${booking.city}`,
        `Start: ${formatDateTime(booking.startTime)}`,
        `End: ${formatDateTime(booking.endTime)}`,
        `Duration: ${booking.durationHours} hour(s)`,
        `Amount Paid: LKR ${amount}`,
        "Payment Status: Paid",
        `Map: ${mapData.mapLink}`,
        "",
        "Thank you for choosing ChargeX.",
    ].join("\n");

    const displayName = escapeHtml(user.name || "there");
    const html = buildBookingConfirmationHtml({
        name: displayName,
        bookingId: escapeHtml(bookingId),
        stationName: escapeHtml(booking.stationName),
        city: escapeHtml(booking.city),
        address: station?.address ? escapeHtml(station.address) : undefined,
        start: escapeHtml(formatDateTime(booking.startTime)),
        end: escapeHtml(formatDateTime(booking.endTime)),
        durationHours: booking.durationHours,
        amount: escapeHtml(amount),
        mapLink: escapeHtml(mapData.mapLink),
    });

    await transporter.sendMail({
        from: fromAddress,
        to: user.email,
        subject: `Booking Confirmed - ChargeX #${bookingId}`,
        text,
        html,
    });
}
