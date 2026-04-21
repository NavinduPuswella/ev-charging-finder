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

function formatDateOnly(value: Date | string): string {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-LK", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Colombo",
    }).format(date);
}

function formatTimeOnly(value: Date | string): string {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-LK", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
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
    bookingDate: string;
    startTime: string;
    endTime: string;
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
        bookingDate,
        startTime,
        endTime,
        durationHours,
        amount,
        mapLink,
    } = params;

    const FONT =
        "-apple-system,BlinkMacSystemFont,'Segoe UI','Inter','Helvetica Neue',Arial,sans-serif";
    const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";
    const GREEN = "#00A844";
    const GREEN_DEEP = "#008536";
    const INK = "#0A0A0A";
    const INK_SOFT = "#2A2A2A";
    const MUTED = "#6B7280";
    const HAIRLINE = "#ECECEC";
    const PAGE_BG = "#F5F5F6";

    const detailRow = (label: string, value: string, isLast = false) => `
        <tr>
            <td style="padding:13px 0;${isLast ? "" : `border-bottom:1px solid ${HAIRLINE};`}font-family:${FONT};font-size:13px;line-height:1.4;color:${MUTED};font-weight:500;width:40%;vertical-align:top;">
                ${label}
            </td>
            <td align="right" style="padding:13px 0;${isLast ? "" : `border-bottom:1px solid ${HAIRLINE};`}font-family:${FONT};font-size:14px;line-height:1.45;color:${INK};font-weight:600;vertical-align:top;">
                ${value}
            </td>
        </tr>`;

    const eyebrow = (text: string) => `
        <div style="font-family:${FONT};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};font-weight:700;margin:0 0 14px;">
            ${text}
        </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Booking Confirmed &middot; ChargeX</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">
        Your ChargeX charging slot is reserved &middot; ${bookingDate} &middot; ${stationName}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${PAGE_BG};">
        <tr>
            <td align="center" style="padding:28px 14px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:472px;background-color:#ffffff;border:1px solid ${HAIRLINE};border-radius:16px;overflow:hidden;">

                    <tr>
                        <td style="background-color:#ffffff;padding:24px 24px;border-bottom:1px solid ${HAIRLINE};">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="font-family:${FONT};font-size:18px;font-weight:800;letter-spacing:-0.02em;line-height:1;color:${INK};">
                                        <span style="color:${INK};">Charge</span><span style="color:${GREEN};">X</span>
                                    </td>
                                    <td align="right" style="vertical-align:middle;">
                                        <span style="display:inline-block;background-color:${GREEN};color:#ffffff;border:1px solid ${GREEN_DEEP};border-radius:999px;padding:10px 18px;font-family:${FONT};font-size:13px;font-weight:800;letter-spacing:0.04em;line-height:1;text-transform:uppercase;">
                                            Confirmed
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:34px 24px 10px;">
                            <h1 style="margin:0;font-family:${FONT};font-size:31px;line-height:1.12;font-weight:800;letter-spacing:-0.028em;color:${INK};">
                                Booking Confirmed
                            </h1>
                            <p style="margin:12px 0 0;font-family:${FONT};font-size:15px;line-height:1.55;color:${MUTED};font-weight:400;">
                                Your charging slot is reserved. A summary of your booking is below.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:26px 24px 2px;">
                            <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.5;color:${INK};font-weight:600;">
                                Hi ${name},
                            </p>
                            <p style="margin:6px 0 0;font-family:${FONT};font-size:14px;line-height:1.6;color:${INK_SOFT};">
                                Thanks for booking with ChargeX. We&rsquo;ve saved your spot &mdash; just arrive on time and plug in.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:30px 24px 0;">
                            <div style="height:1px;background-color:${HAIRLINE};line-height:1px;font-size:0;">&nbsp;</div>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:24px 24px 6px;">
                            ${eyebrow("Booking Details")}
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                ${detailRow("Booking ID", `<span style="font-family:${MONO};font-size:12.5px;color:${INK_SOFT};letter-spacing:0.01em;">${bookingId}</span>`)}
                                ${detailRow("Station", stationName)}
                                ${detailRow("City", city)}
                                ${address ? detailRow("Address", address) : ""}
                                ${detailRow("Date", bookingDate)}
                                ${detailRow("Start Time", startTime)}
                                ${detailRow("End Time", endTime)}
                                ${detailRow("Duration", `${durationHours} hour${durationHours === 1 ? "" : "s"}`, true)}
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:24px 24px 0;">
                            <div style="height:1px;background-color:${HAIRLINE};line-height:1px;font-size:0;">&nbsp;</div>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:24px 24px 6px;">
                            ${eyebrow("Payment Summary")}
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                <tr>
                                    <td style="padding:6px 0;font-family:${FONT};font-size:13px;color:${MUTED};font-weight:500;">
                                        Amount Paid
                                    </td>
                                    <td align="right" style="padding:6px 0;font-family:${FONT};font-size:14px;color:${INK_SOFT};font-weight:600;">
                                        LKR ${amount}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0 14px;font-family:${FONT};font-size:13px;color:${MUTED};font-weight:500;">
                                        Payment Status
                                    </td>
                                    <td align="right" style="padding:6px 0 14px;font-family:${FONT};font-size:13px;font-weight:600;line-height:1.4;color:${GREEN};">
                                        Paid
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding:0;">
                                        <div style="height:1px;background-color:${HAIRLINE};line-height:1px;font-size:0;">&nbsp;</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:16px 0 0;font-family:${FONT};font-size:15px;color:${INK};font-weight:700;letter-spacing:-0.005em;">
                                        Total
                                    </td>
                                    <td align="right" style="padding:16px 0 0;font-family:${FONT};font-size:20px;color:${INK};font-weight:800;letter-spacing:-0.015em;">
                                        LKR ${amount}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:30px 24px 6px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td>
                                        <a href="${mapLink}" target="_blank" rel="noopener noreferrer"
                                           style="display:block;background-color:${INK};color:#ffffff;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;text-align:center;text-decoration:none;padding:16px 20px;border-radius:12px;letter-spacing:0.005em;">
                                            View on Map
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top:10px;font-family:${FONT};font-size:12px;color:${MUTED};line-height:1.5;">
                                        Opens the station location in Google Maps.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:30px 24px 0;">
                            <div style="height:1px;background-color:${HAIRLINE};line-height:1px;font-size:0;">&nbsp;</div>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:24px 24px 24px;">
                            <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.55;color:${INK_SOFT};font-weight:500;">
                                Thanks for choosing <span style="color:${INK};font-weight:700;">Charge</span><span style="color:${GREEN};font-weight:700;">X</span>.
                            </p>
                            <p style="margin:8px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">
                                This is an automated message sent from an unmonitored address. Please do not reply.
                            </p>
                        </td>
                    </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:472px;">
                    <tr>
                        <td align="center" style="padding:14px 16px 6px;font-family:${FONT};font-size:11px;line-height:1.6;color:${MUTED};">
                            &copy; ChargeX
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
        bookingDate: escapeHtml(formatDateOnly(booking.startTime)),
        startTime: escapeHtml(formatTimeOnly(booking.startTime)),
        endTime: escapeHtml(formatTimeOnly(booking.endTime)),
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
