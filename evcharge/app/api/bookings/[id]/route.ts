import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Slot from "@/models/Slot";
import { getAuthUser } from "@/lib/auth";

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

        // Verify ownership
        if (booking.userId.toString() !== user.userId && user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (status === "CANCELLED") {
            booking.status = "CANCELLED";
            booking.paymentStatus = "REFUNDED";
            await booking.save();

            // Release the slot
            await Slot.findByIdAndUpdate(booking.slotId, { status: "AVAILABLE" });

            return NextResponse.json({
                booking,
                message: "Booking cancelled and refund processed.",
            });
        }

        if (status === "COMPLETED") {
            booking.status = "COMPLETED";
            await booking.save();
            return NextResponse.json({ booking, message: "Booking marked as completed." });
        }

        return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
