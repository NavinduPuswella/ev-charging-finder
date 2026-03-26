import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { order_id, amount, currency } = body;

        if (!order_id || !amount || !currency) {
            return NextResponse.json(
                { error: "order_id, amount, and currency are required" },
                { status: 400 }
            );
        }

        const merchantId = process.env.PAYHERE_MERCHANT_ID;
        const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;

        if (!merchantId || !merchantSecret) {
            return NextResponse.json(
                { error: "PayHere credentials not configured" },
                { status: 500 }
            );
        }

        const merchantSecretHash = crypto
            .createHash("md5")
            .update(merchantSecret)
            .digest("hex")
            .toUpperCase();

        const amountFormatted = parseFloat(amount).toFixed(2);

        const hashString =
            merchantId + order_id + amountFormatted + currency + merchantSecretHash;

        const hash = crypto
            .createHash("md5")
            .update(hashString)
            .digest("hex")
            .toUpperCase();

        return NextResponse.json({ hash });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
