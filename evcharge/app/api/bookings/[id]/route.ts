import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import { getAuthUser } from "@/lib/auth";
import {
    syncStationSlotStatusesForWindow,
    syncStationStatusFromAvailability,
    isCancellable,
    isBookingExpired,
} from "@/lib/booking-availability";
import { sendBookingConfirmationEmail } from "@/lib/booking-email";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        const booking = await Booking.findById(id);
        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        if (booking.userId.toString() !== user.userId && user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (status === "CANCELLED") {
            if (booking.status === "CANCELLED") {
                return NextResponse.json(
                    { error: "This booking has already been cancelled." },
                    { status: 400 }
                );
            }

            if (booking.status === "COMPLETED") {
                return NextResponse.json(
                    { error: "A completed booking cannot be cancelled." },
                    { status: 400 }
                );
            }

            if (
                booking.status !== "PENDING_PAYMENT" &&
                isBookingExpired(booking.endTime)
            ) {
                return NextResponse.json(
                    {
                        error:
                            "This booking can no longer be cancelled because the booked time has already passed.",
                    },
                    { status: 400 }
                );
            }

            if (
                user.role !== "ADMIN" &&
                booking.status !== "PENDING_PAYMENT" &&
                !isCancellable(booking.status, booking.endTime)
            ) {
                return NextResponse.json(
                    {
                        error:
                            "This booking can no longer be cancelled because the booked time has already passed.",
                    },
                    { status: 400 }
                );
            }

            booking.status = "CANCELLED";
            await booking.save();
            await syncStationSlotStatusesForWindow(
                String(booking.stationId),
                new Date(booking.startTime),
                new Date(booking.endTime)
            );
            await syncStationStatusFromAvailability(String(booking.stationId));

            return NextResponse.json({
                booking,
                message: "Booking cancelled. No refund will be issued.",
            });
        }

        if (status === "COMPLETED") {
            booking.status = "COMPLETED";
            await booking.save();
            await syncStationSlotStatusesForWindow(
                String(booking.stationId),
                new Date(booking.startTime),
                new Date(booking.endTime)
            );
            await syncStationStatusFromAvailability(String(booking.stationId));
            return NextResponse.json({ booking, message: "Booking marked as completed." });
        }

        if (status === "CONFIRMED") {
            const shouldSendConfirmationEmail =
                booking.status !== "CONFIRMED" || booking.paymentStatus !== "PAID";

            if (process.env.NODE_ENV === "production") {
                return NextResponse.json(
                    {
                        error: "Manual payment confirmation is disabled in production.",
                    },
                    { status: 403 }
                );
            }

            if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
                return NextResponse.json(
                    { error: "This booking can no longer be confirmed." },
                    { status: 400 }
                );
            }

            booking.status = "CONFIRMED";
            booking.paymentStatus = "PAID";
            await booking.save();

            if (shouldSendConfirmationEmail) {
                try {
                    await sendBookingConfirmationEmail(booking);
                } catch (emailError: unknown) {
                    const emailMessage =
                        emailError instanceof Error
                            ? emailError.message
                            : "Unknown email error";
                    console.error(
                        `Manual confirm: failed to send confirmation email for booking ${id}: ${emailMessage}`
                    );
                }
            }

            await syncStationSlotStatusesForWindow(
                String(booking.stationId),
                new Date(booking.startTime),
                new Date(booking.endTime)
            );
            await syncStationStatusFromAvailability(String(booking.stationId));
            return NextResponse.json({
                booking,
                message: "Booking payment confirmed.",
            });
        }

        return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
