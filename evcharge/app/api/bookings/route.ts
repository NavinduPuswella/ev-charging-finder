import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Slot from "@/models/Slot";
import Station from "@/models/Station";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();

        let bookings;
        if (user.role === "STATION_OWNER") {
            // Get bookings for owner's stations
            const stations = await Station.find({ ownerId: user.userId });
            const stationIds = stations.map((s) => s._id);
            bookings = await Booking.find({ stationId: { $in: stationIds } })
                .populate("userId", "name email")
                .populate("stationId", "name city")
                .populate("slotId")
                .sort({ createdAt: -1 });
        } else {
            bookings = await Booking.find({ userId: user.userId })
                .populate("stationId", "name city pricePerKwh")
                .populate("slotId")
                .sort({ createdAt: -1 });
        }

        return NextResponse.json({ bookings });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();
        const body = await request.json();
        const { stationId, slotId, date, duration } = body;

        // Verify slot availability
        const slot = await Slot.findById(slotId);
        if (!slot || slot.status !== "AVAILABLE") {
            return NextResponse.json(
                { error: "Slot is not available" },
                { status: 400 }
            );
        }

        // Get station for price calculation
        const station = await Station.findById(stationId);
        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        const amount = station.pricePerKwh * (duration || 1) * 10; // Mock calculation

        // Mock Stripe payment
        const paymentStatus = "PAID"; // Mock: always succeeds

        const booking = await Booking.create({
            userId: user.userId,
            stationId,
            slotId,
            date,
            duration: duration || 1,
            status: "CONFIRMED",
            paymentStatus,
            amount,
        });

        // Mark slot as booked
        await Slot.findByIdAndUpdate(slotId, { status: "BOOKED" });

        return NextResponse.json(
            {
                booking,
                message: "Booking confirmed! Payment processed successfully.",
                paymentDetails: {
                    amount,
                    currency: "USD",
                    status: "succeeded",
                    method: "Mock Stripe",
                },
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
