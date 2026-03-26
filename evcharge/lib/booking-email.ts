import nodemailer from "nodemailer";
import type { IBooking } from "@/models/Booking";
import User from "@/models/User";

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

    const text = [
        `Hi ${user.name || "there"},`,
        "",
        "Your EVCharge booking is confirmed.",
        `Booking ID: ${bookingId}`,
        `Station: ${booking.stationName}`,
        `City: ${booking.city}`,
        `Start: ${formatDateTime(booking.startTime)}`,
        `End: ${formatDateTime(booking.endTime)}`,
        `Duration: ${booking.durationHours} hour(s)`,
        `Amount Paid: LKR ${amount}`,
        "",
        "Thank you for choosing EVCharge.",
    ].join("\n");

    await transporter.sendMail({
        from: fromAddress,
        to: user.email,
        subject: `Booking Confirmed - EVCharge #${bookingId}`,
        text,
        html: `
            <p>Hi ${user.name || "there"},</p>
            <p>Your EVCharge booking is <strong>confirmed</strong>.</p>
            <ul>
                <li><strong>Booking ID:</strong> ${bookingId}</li>
                <li><strong>Station:</strong> ${booking.stationName}</li>
                <li><strong>City:</strong> ${booking.city}</li>
                <li><strong>Start:</strong> ${formatDateTime(booking.startTime)}</li>
                <li><strong>End:</strong> ${formatDateTime(booking.endTime)}</li>
                <li><strong>Duration:</strong> ${booking.durationHours} hour(s)</li>
                <li><strong>Amount Paid:</strong> LKR ${amount}</li>
            </ul>
            <p>Thank you for choosing EVCharge.</p>
        `,
    });
}
