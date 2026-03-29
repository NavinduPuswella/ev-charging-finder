import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type MailTransporter = nodemailer.Transporter;

declare global {
    // eslint-disable-next-line no-var
    var contactMailTransporter: MailTransporter | undefined;
}

function getMailTransporter(): MailTransporter {
    const user = process.env.GMAIL_SMTP_USER;
    const pass = process.env.GMAIL_SMTP_PASS;

    if (!user || !pass) {
        throw new Error("Email transport is not configured");
    }

    if (!global.contactMailTransporter) {
        global.contactMailTransporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user, pass },
        });
    }

    return global.contactMailTransporter;
}

function clean(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const name = clean(body.name);
        const email = clean(body.email);
        const subject = clean(body.subject);
        const message = clean(body.message);

        if (!name || !email || !subject || !message) {
            return NextResponse.json({ error: "All fields are required." }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
        }

        const adminEmail = process.env.ADMIN_CONTACT_EMAIL || process.env.GMAIL_SMTP_USER;
        if (!adminEmail) {
            return NextResponse.json({ error: "Admin email is not configured." }, { status: 500 });
        }

        const transporter = getMailTransporter();
        const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_SMTP_USER!;

        const submittedAt = new Intl.DateTimeFormat("en-LK", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Colombo",
        }).format(new Date());

        const safeName = escapeHtml(name);
        const safeEmail = escapeHtml(email);
        const safeSubject = escapeHtml(subject);
        const safeSubmittedAt = escapeHtml(submittedAt);
        const safeMessage = escapeHtml(message);

        await transporter.sendMail({
            from: fromAddress,
            to: adminEmail,
            replyTo: email,
            subject: `[Contact Form] ${subject}`,
            text: [
                "New contact form submission",
                "",
                `Name: ${name}`,
                `Email: ${email}`,
                `Subject: ${subject}`,
                `Submitted At: ${submittedAt}`,
                "",
                "Message:",
                message,
            ].join("\n"),
            html: `
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
                    <h2 style="margin:0 0 12px;">New contact form submission</h2>
                    <p style="margin:0 0 8px;"><strong>Name:</strong> ${safeName}</p>
                    <p style="margin:0 0 8px;"><strong>Email:</strong> ${safeEmail}</p>
                    <p style="margin:0 0 8px;"><strong>Subject:</strong> ${safeSubject}</p>
                    <p style="margin:0 0 16px;"><strong>Submitted At:</strong> ${safeSubmittedAt}</p>
                    <p style="margin:0 0 6px;"><strong>Message:</strong></p>
                    <div style="white-space:pre-wrap;border:1px solid #e5e7eb;padding:12px;border-radius:8px;background:#fafafa;">${safeMessage}</div>
                </div>
            `,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to send message";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
