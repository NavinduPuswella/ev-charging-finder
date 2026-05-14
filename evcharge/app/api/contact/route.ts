import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type MailTransporter = nodemailer.Transporter;

declare global {
    var contactMailTransporter: MailTransporter | undefined;
}

const MAX_MESSAGE_WORDS = 120;
const MAX_SUBJECT_LENGTH = 100;
const NAME_REGEX = /^[A-Za-z][A-Za-z\s'.-]*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function normalizeSingleLine(value: unknown): string {
    return clean(value).replace(/\s+/g, " ");
}

function countWords(value: string): number {
    const words = value.trim().match(/\S+/g);
    return words ? words.length : 0;
}

type ContactFields = {
    name: string;
    email: string;
    subject: string;
    message: string;
};

function validateContactPayload(values: ContactFields): Record<keyof ContactFields, string> {
    const errors: Record<keyof ContactFields, string> = {
        name: "",
        email: "",
        subject: "",
        message: "",
    };

    if (!values.name) {
        errors.name = "Name is required.";
    } else if (values.name.length < 2) {
        errors.name = "Name must be at least 2 characters.";
    } else if (!NAME_REGEX.test(values.name)) {
        errors.name = "Name contains invalid symbols.";
    }

    if (!values.email) {
        errors.email = "Email is required.";
    } else if (!EMAIL_REGEX.test(values.email)) {
        errors.email = "Please enter a valid email address.";
    }

    if (!values.subject) {
        errors.subject = "Subject is required.";
    } else if (values.subject.length < 3) {
        errors.subject = "Subject must be at least 3 characters.";
    } else if (values.subject.length > MAX_SUBJECT_LENGTH) {
        errors.subject = `Subject must be ${MAX_SUBJECT_LENGTH} characters or less.`;
    } else if (!/[A-Za-z0-9]/.test(values.subject)) {
        errors.subject = "Please add a meaningful subject.";
    }

    if (!values.message) {
        errors.message = "Message is required.";
    } else if (countWords(values.message) > MAX_MESSAGE_WORDS) {
        errors.message = "Message must be 120 words or less.";
    }

    return errors;
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
        const name = normalizeSingleLine(body.name);
        const email = normalizeSingleLine(body.email);
        const subject = normalizeSingleLine(body.subject);
        const message = clean(body.message);

        const payload: ContactFields = { name, email, subject, message };
        const fieldErrors = validateContactPayload(payload);
        const hasValidationError = Object.values(fieldErrors).some(Boolean);
        if (hasValidationError) {
            return NextResponse.json(
                { error: "Please correct the highlighted form errors.", fieldErrors },
                { status: 400 }
            );
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
        const safeWordCount = escapeHtml(String(countWords(message)));
        const safeAdminEmail = escapeHtml(adminEmail);

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
                `Word Count: ${countWords(message)} / ${MAX_MESSAGE_WORDS}`,
                "",
                "Message:",
                message,
            ].join("\n"),
            html: `
                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f8fafc;padding:24px;">
                    <div style="max-width:640px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;overflow:hidden;">
                        <div style="padding:18px 22px;border-bottom:1px solid #e2e8f0;background:#f0fdf4;">
                            <h2 style="margin:0;font-size:20px;line-height:1.3;color:#052e16;">New Contact Form Submission</h2>
                            <p style="margin:6px 0 0;color:#166534;font-size:13px;">ChargeX support inbox: ${safeAdminEmail}</p>
                        </div>
                        <div style="padding:22px;">
                            <table style="width:100%;border-collapse:collapse;">
                                <tr>
                                    <td style="padding:8px 0;color:#64748b;font-size:13px;">Name</td>
                                    <td style="padding:8px 0;color:#0f172a;font-weight:600;text-align:right;">${safeName}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px 0;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9;">Email</td>
                                    <td style="padding:8px 0;color:#0f172a;font-weight:600;text-align:right;border-top:1px solid #f1f5f9;">${safeEmail}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px 0;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9;">Subject</td>
                                    <td style="padding:8px 0;color:#0f172a;font-weight:600;text-align:right;border-top:1px solid #f1f5f9;">${safeSubject}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px 0;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9;">Submitted At</td>
                                    <td style="padding:8px 0;color:#0f172a;font-weight:600;text-align:right;border-top:1px solid #f1f5f9;">${safeSubmittedAt}</td>
                                </tr>
                                <tr>
                                    <td style="padding:8px 0;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9;">Word Count</td>
                                    <td style="padding:8px 0;color:#0f172a;font-weight:600;text-align:right;border-top:1px solid #f1f5f9;">${safeWordCount} / ${MAX_MESSAGE_WORDS}</td>
                                </tr>
                            </table>
                            <p style="margin:18px 0 8px;font-weight:700;color:#0f172a;">Message</p>
                            <div style="white-space:pre-wrap;border:1px solid #e2e8f0;padding:14px;border-radius:12px;background:#f8fafc;">${safeMessage}</div>
                        </div>
                    </div>
                </div>
            `,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to send message";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
