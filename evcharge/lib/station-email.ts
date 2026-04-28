import nodemailer from "nodemailer";
import type { IStation } from "@/models/Station";
import User from "@/models/User";

type MailTransporter = nodemailer.Transporter;

declare global {
    var stationMailTransporter: MailTransporter | undefined;
}

function getMailTransporter(): MailTransporter {
    const user = process.env.GMAIL_SMTP_USER;
    const pass = process.env.GMAIL_SMTP_PASS;

    if (!user || !pass) {
        throw new Error("Gmail SMTP credentials are not configured");
    }

    if (!global.stationMailTransporter) {
        global.stationMailTransporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user, pass },
        });
    }

    return global.stationMailTransporter;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function normalizeChargerTypesDisplay(value: unknown): string {
    if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === "string").join(", ");
    }
    if (typeof value === "string") return value;
    return "";
}

interface StationEmailRecipient {
    email: string;
    name: string;
}

async function resolveRecipient(station: IStation): Promise<StationEmailRecipient | null> {
    if (station.requesterEmail) {
        return {
            email: station.requesterEmail,
            name: station.requesterName || "there",
        };
    }
    if (station.submitterEmail) {
        return {
            email: station.submitterEmail,
            name: station.submitterName || "there",
        };
    }
    if (station.ownerId) {
        const owner = await User.findById(station.ownerId).select("name email").lean<{
            name?: string;
            email?: string;
        }>();
        if (owner?.email) {
            return {
                email: owner.email,
                name: owner.name || "there",
            };
        }
    }
    return null;
}

function buildApprovalHtml(params: {
    name: string;
    stationName: string;
    city: string;
    address?: string;
    chargerType: string;
    totalPoints: number;
    pricePerKwh: number;
    mapLink: string;
    stationsLink: string;
}): string {
    const {
        name,
        stationName,
        city,
        address,
        chargerType,
        totalPoints,
        pricePerKwh,
        mapLink,
        stationsLink,
    } = params;

    const FONT =
        "-apple-system,BlinkMacSystemFont,'Segoe UI','Inter','Helvetica Neue',Arial,sans-serif";
    const GREEN = "#00A844";
    const GREEN_DEEP = "#008536";
    const INK = "#0A0A0A";
    const INK_SOFT = "#2A2A2A";
    const MUTED = "#6B7280";
    const HAIRLINE = "#ECECEC";
    const PAGE_BG = "#F5F5F6";

    const detailRow = (label: string, value: string, isLast = false) => `
        <tr>
            <td style="padding:13px 0;${isLast ? "" : `border-bottom:1px solid ${HAIRLINE};`}font-family:${FONT};font-size:13px;line-height:1.4;color:${MUTED};font-weight:500;width:42%;vertical-align:top;">
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
    <title>Station Approved &middot; ChargeX</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">
        Your charging station ${stationName} has been approved on ChargeX.
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
                                            Approved
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:34px 24px 10px;">
                            <h1 style="margin:0;font-family:${FONT};font-size:30px;line-height:1.15;font-weight:800;letter-spacing:-0.025em;color:${INK};">
                                Your station is live
                            </h1>
                            <p style="margin:12px 0 0;font-family:${FONT};font-size:15px;line-height:1.55;color:${MUTED};font-weight:400;">
                                Great news &mdash; your submission has been reviewed and approved by the ChargeX admin team.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:26px 24px 2px;">
                            <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.5;color:${INK};font-weight:600;">
                                Hi ${name},
                            </p>
                            <p style="margin:6px 0 0;font-family:${FONT};font-size:14px;line-height:1.6;color:${INK_SOFT};">
                                <strong style="color:${INK};">${stationName}</strong> is now visible on ChargeX and ready to receive bookings from EV drivers across Sri Lanka.
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
                            ${eyebrow("Station Details")}
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                ${detailRow("Name", stationName)}
                                ${detailRow("City", city)}
                                ${address ? detailRow("Address", address) : ""}
                                ${detailRow("Charger Type(s)", chargerType)}
                                ${detailRow("Charging Points", String(totalPoints))}
                                ${detailRow("Price", `LKR ${pricePerKwh} / kWh`, true)}
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:30px 24px 6px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td>
                                        <a href="${stationsLink}" target="_blank" rel="noopener noreferrer"
                                           style="display:block;background-color:${INK};color:#ffffff;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;text-align:center;text-decoration:none;padding:16px 20px;border-radius:12px;letter-spacing:0.005em;">
                                            View on ChargeX
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top:10px;">
                                        <a href="${mapLink}" target="_blank" rel="noopener noreferrer"
                                           style="display:block;background-color:#ffffff;color:${INK};font-family:${FONT};font-size:14px;font-weight:600;line-height:1;text-align:center;text-decoration:none;padding:14px 20px;border:1px solid ${HAIRLINE};border-radius:12px;letter-spacing:0.005em;">
                                            Open in Google Maps
                                        </a>
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
                                Need to update station details, hours, or pricing? Just reply to this email or contact us via the ChargeX dashboard.
                            </p>
                            <p style="margin:14px 0 0;font-family:${FONT};font-size:14px;line-height:1.55;color:${INK_SOFT};font-weight:500;">
                                Welcome aboard &mdash; <span style="color:${INK};font-weight:700;">Charge</span><span style="color:${GREEN};font-weight:700;">X</span>.
                            </p>
                            <p style="margin:8px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">
                                This is an automated notification. You received it because you submitted a station to ChargeX.
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

function buildRejectionHtml(params: {
    name: string;
    stationName: string;
    city: string;
    address?: string;
    chargerType: string;
    totalPoints: number;
    pricePerKwh: string;
    resubmitLink: string;
    supportEmail: string;
}): string {
    const {
        name,
        stationName,
        city,
        address,
        chargerType,
        totalPoints,
        pricePerKwh,
        resubmitLink,
        supportEmail,
    } = params;

    const FONT =
        "-apple-system,BlinkMacSystemFont,'Segoe UI','Inter','Helvetica Neue',Arial,sans-serif";
    const RED = "#DC2626";
    const RED_DEEP = "#B91C1C";
    const INK = "#0A0A0A";
    const INK_SOFT = "#2A2A2A";
    const MUTED = "#6B7280";
    const HAIRLINE = "#ECECEC";
    const PAGE_BG = "#F5F5F6";

    const detailRow = (label: string, value: string, isLast = false) => `
        <tr>
            <td style="padding:13px 0;${isLast ? "" : `border-bottom:1px solid ${HAIRLINE};`}font-family:${FONT};font-size:13px;line-height:1.4;color:${MUTED};font-weight:500;width:42%;vertical-align:top;">
                ${label}
            </td>
            <td align="right" style="padding:13px 0;${isLast ? "" : `border-bottom:1px solid ${HAIRLINE};`}font-family:${FONT};font-size:14px;line-height:1.45;color:${INK};font-weight:600;vertical-align:top;">
                ${value}
            </td>
        </tr>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <title>Station Review Update &middot; ChargeX</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">
        Your charging station ${stationName} was not approved on ChargeX.
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
                                        <span style="color:${INK};">Charge</span><span style="color:#00A844;">X</span>
                                    </td>
                                    <td align="right" style="vertical-align:middle;">
                                        <span style="display:inline-block;background-color:${RED};color:#ffffff;border:1px solid ${RED_DEEP};border-radius:999px;padding:10px 18px;font-family:${FONT};font-size:13px;font-weight:800;letter-spacing:0.04em;line-height:1;text-transform:uppercase;">
                                            Not approved
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:34px 24px 10px;">
                            <h1 style="margin:0;font-family:${FONT};font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-0.025em;color:${INK};">
                                Station approval failed
                            </h1>
                            <p style="margin:12px 0 0;font-family:${FONT};font-size:15px;line-height:1.55;color:${MUTED};font-weight:400;">
                                Hi ${name}, thank you for submitting your charging station to ChargeX. After review, the admin team could not approve this listing at this time.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:24px 24px 6px;">
                            <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${INK_SOFT};">
                                Please review the station details and submit again with complete, accurate information. If you believe this was a mistake, contact us at
                                <a href="mailto:${supportEmail}" style="color:${RED};font-weight:700;text-decoration:none;">${supportEmail}</a>.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:26px 24px 0;">
                            <div style="height:1px;background-color:${HAIRLINE};line-height:1px;font-size:0;">&nbsp;</div>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:22px 24px 6px;">
                            <div style="font-family:${FONT};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};font-weight:700;margin:0 0 14px;">
                                Reviewed Submission
                            </div>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                ${detailRow("Name", stationName)}
                                ${detailRow("City", city)}
                                ${address ? detailRow("Address", address) : ""}
                                ${detailRow("Charger Type(s)", chargerType)}
                                ${detailRow("Charging Points", String(totalPoints))}
                                ${detailRow("Price", `LKR ${pricePerKwh} / kWh`, true)}
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#ffffff;padding:28px 24px 28px;">
                            <a href="${resubmitLink}" target="_blank" rel="noopener noreferrer"
                               style="display:block;background-color:${INK};color:#ffffff;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;text-align:center;text-decoration:none;padding:16px 20px;border-radius:12px;letter-spacing:0.005em;">
                                Submit Again
                            </a>
                            <p style="margin:18px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">
                                This is an automated notification. You received it because you submitted a station to ChargeX.
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

export async function sendStationApprovalEmail(station: IStation): Promise<void> {
    const recipient = await resolveRecipient(station);
    if (!recipient) {
        console.warn(
            `Station approval email skipped: no recipient email for station ${station._id}`
        );
        return;
    }

    const transporter = getMailTransporter();
    const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_SMTP_USER!;
    const stationName = station.name;
    const city = station.city;
    const address = station.address;
    const chargerType = normalizeChargerTypesDisplay(station.chargerType) || "—";
    const totalPoints = station.totalChargingPoints || station.totalSlots || 0;
    const pricePerKwh = Number(station.pricePerKwh || 0).toFixed(2);

    const lat = station.location?.latitude;
    const lng = station.location?.longitude;
    const mapLink =
        typeof lat === "number" && typeof lng === "number"
            ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${stationName}, ${city}`
              )}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chargex.lk";
    const stationsLink = `${appUrl.replace(/\/$/, "")}/stations`;

    const text = [
        `Hi ${recipient.name},`,
        "",
        `Great news — your station "${stationName}" has been approved by the ChargeX admin team.`,
        "",
        "Station details:",
        `  Name: ${stationName}`,
        `  City: ${city}`,
        ...(address ? [`  Address: ${address}`] : []),
        `  Charger Type(s): ${chargerType}`,
        `  Charging Points: ${totalPoints}`,
        `  Price: LKR ${pricePerKwh} / kWh`,
        "",
        `View on ChargeX: ${stationsLink}`,
        `Open in Maps: ${mapLink}`,
        "",
        "Welcome aboard,",
        "The ChargeX team",
    ].join("\n");

    const html = buildApprovalHtml({
        name: escapeHtml(recipient.name),
        stationName: escapeHtml(stationName),
        city: escapeHtml(city),
        address: address ? escapeHtml(address) : undefined,
        chargerType: escapeHtml(chargerType),
        totalPoints,
        pricePerKwh: Number(pricePerKwh),
        mapLink: escapeHtml(mapLink),
        stationsLink: escapeHtml(stationsLink),
    });

    await transporter.sendMail({
        from: fromAddress,
        to: recipient.email,
        subject: `Your charging station "${stationName}" is approved on ChargeX`,
        text,
        html,
    });
}

export async function sendStationRejectionEmail(station: IStation): Promise<void> {
    const recipient = await resolveRecipient(station);
    if (!recipient) {
        console.warn(
            `Station rejection email skipped: no recipient email for station ${station._id}`
        );
        return;
    }

    const transporter = getMailTransporter();
    const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_SMTP_USER!;
    const stationName = station.name;
    const city = station.city;
    const address = station.address;
    const chargerType = normalizeChargerTypesDisplay(station.chargerType) || "Not provided";
    const totalPoints = station.totalChargingPoints || station.totalSlots || 0;
    const pricePerKwh = Number(station.pricePerKwh || 0).toFixed(2);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chargex.lk";
    const resubmitLink = `${appUrl.replace(/\/$/, "")}/list-station`;
    const supportEmail = process.env.ADMIN_CONTACT_EMAIL || process.env.GMAIL_SMTP_USER!;

    const text = [
        `Hi ${recipient.name},`,
        "",
        `Thank you for submitting "${stationName}" to ChargeX.`,
        "After review, the admin team could not approve this station listing at this time.",
        "",
        "Please review the station details and submit again with complete, accurate information.",
        "",
        "Reviewed submission:",
        `  Name: ${stationName}`,
        `  City: ${city}`,
        ...(address ? [`  Address: ${address}`] : []),
        `  Charger Type(s): ${chargerType}`,
        `  Charging Points: ${totalPoints}`,
        `  Price: LKR ${pricePerKwh} / kWh`,
        "",
        `Submit again: ${resubmitLink}`,
        `Support: ${supportEmail}`,
        "",
        "The ChargeX team",
    ].join("\n");

    const html = buildRejectionHtml({
        name: escapeHtml(recipient.name),
        stationName: escapeHtml(stationName),
        city: escapeHtml(city),
        address: address ? escapeHtml(address) : undefined,
        chargerType: escapeHtml(chargerType),
        totalPoints,
        pricePerKwh,
        resubmitLink: escapeHtml(resubmitLink),
        supportEmail: escapeHtml(supportEmail),
    });

    await transporter.sendMail({
        from: fromAddress,
        to: recipient.email,
        subject: `Your charging station "${stationName}" was not approved on ChargeX`,
        text,
        html,
    });
}
