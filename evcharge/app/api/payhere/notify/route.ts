import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import {
    syncStationSlotStatusesForWindow,
    syncStationStatusFromAvailability,
} from "@/lib/booking-availability";
import { sendBookingConfirmationEmail } from "@/lib/booking-email";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const merchant_id = formData.get("merchant_id") as string;
        const order_id = formData.get("order_id") as string;
        const payhere_amount = formData.get("payhere_amount") as string;
        const payhere_currency = formData.get("payhere_currency") as string;
        const status_code = formData.get("status_code") as string;
        const md5sig = formData.get("md5sig") as string;

        const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
        if (!merchantSecret) {
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

        const localHash = crypto
            .createHash("md5")
            .update(
                merchant_id +
                    order_id +
                    payhere_amount +
                    payhere_currency +
                    status_code +
                    merchantSecretHash
            )
            .digest("hex")
            .toUpperCase();

        if (localHash !== md5sig?.toUpperCase()) {
            console.error("PayHere notify: md5sig verification failed");
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 403 }
            );
        }

        await dbConnect();

        const booking = await Booking.findById(order_id);
        if (!booking) {
            console.error(`PayHere notify: Booking ${order_id} not found`);
            return NextResponse.json(
                { error: "Booking not found" },
                { status: 404 }
            );
        }

        if (status_code === "2") {
            const shouldSendConfirmationEmail =
                booking.status !== "CONFIRMED" || booking.paymentStatus !== "PAID";

            booking.paymentStatus = "PAID";
            booking.status = "CONFIRMED";
            await booking.save();

            await syncStationSlotStatusesForWindow(
                String(booking.stationId),
                new Date(booking.startTime),
                new Date(booking.endTime)
            );
            await syncStationStatusFromAvailability(String(booking.stationId));

            console.log(
                `PayHere notify: Booking ${order_id} payment confirmed`
            );

            if (shouldSendConfirmationEmail) {
                try {
                    await sendBookingConfirmationEmail(booking);
                } catch (emailError: unknown) {
                    const emailMessage =
                        emailError instanceof Error
                            ? emailError.message
                            : "Unknown email error";
                    console.error(
                        `PayHere notify: failed to send confirmation email for booking ${order_id}: ${emailMessage}`
                    );
                }
            }
        } else if (status_code === "-1" || status_code === "-2") {
            booking.paymentStatus = "REFUNDED";
            booking.status = "CANCELLED";
            await booking.save();

            console.log(
                `PayHere notify: Booking ${order_id} payment failed/cancelled (status ${status_code})`
            );
        } else {
            console.log(
                `PayHere notify: Booking ${order_id} status_code=${status_code} (pending/other)`
            );
        }

        return NextResponse.json({ status: "OK" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        console.error("PayHere notify error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
