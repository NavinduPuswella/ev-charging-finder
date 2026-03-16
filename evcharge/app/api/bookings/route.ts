import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Station from "@/models/Station";
import { getAuthUser } from "@/lib/auth";
import {
    addHours,
    buildDateTime,
    getOverlappingBookingCount,
    syncStationSlotStatusesForWindow,
    syncStationStatusFromAvailability,
} from "@/lib/booking-availability";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();

        let bookings;
        if (user.role === "ADMIN") {
            // Admin sees all bookings
            bookings = await Booking.find()
                .populate("userId", "name email")
                .populate("stationId", "name city")
                .sort({ createdAt: -1 });
        } else if (user.role === "STATION_OWNER") {
            // Get bookings for owner's stations
            const stations = await Station.find({ ownerId: user.userId });
            const stationIds = stations.map((s) => s._id);
            bookings = await Booking.find({ stationId: { $in: stationIds } })
                .populate("userId", "name email")
                .populate("stationId", "name city")
                .sort({ createdAt: -1 });
        } else {
            bookings = await Booking.find({ userId: user.userId })
                .populate("stationId", "name city pricePerKwh")
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
        const stationId = body.stationId;
        const bookingDate = String(body.bookingDate || body.date || "");
        const startTimeRaw = String(body.startTime || "");
        const durationHours = Number(body.durationHours || body.duration || 1);

        if (!stationId || !bookingDate || !startTimeRaw || durationHours < 1) {
            return NextResponse.json(
                { error: "stationId, bookingDate, startTime, and durationHours are required" },
                { status: 400 }
            );
        }

        const startTime = buildDateTime(bookingDate, startTimeRaw);
        if (Number.isNaN(startTime.getTime())) {
            return NextResponse.json({ error: "Invalid date or start time" }, { status: 400 });
        }

        const endTime = addHours(startTime, durationHours);

        // Get station for price calculation
        const station = await Station.findById(stationId);
        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        const totalChargingPoints = station.totalChargingPoints || station.totalSlots;
        const overlappingCount = await getOverlappingBookingCount(
            stationId,
            startTime,
            endTime
        );

        if (overlappingCount >= totalChargingPoints) {
            return NextResponse.json(
                {
                    error: "Selected time is fully booked. Please choose another time.",
                    availability: {
                        totalChargingPoints,
                        occupied: overlappingCount,
                        available: 0,
                    },
                },
                { status: 409 }
            );
        }

        const amount = Number((station.pricePerKwh * durationHours).toFixed(2));

        // Mock Stripe payment
        const paymentStatus = "PAID"; // Mock: always succeeds

        const booking = await Booking.create({
            userId: user.userId,
            stationId,
            stationName: station.name,
            city: station.city,
            bookingDate,
            startTime,
            endTime,
            durationHours,
            chargerType: station.chargerType,
            pricePerKwh: station.pricePerKwh,
            status: "CONFIRMED",
            paymentStatus,
            amount,
        });

        await syncStationSlotStatusesForWindow(stationId, startTime, endTime);
        await syncStationStatusFromAvailability(stationId);

        return NextResponse.json(
            {
                booking,
                message: "Booking confirmed! Payment processed successfully.",
                paymentDetails: {
                    amount,
                    currency: "LKR",
                    status: "succeeded",
                    method: "Mock Stripe",
                },
                availability: {
                    totalChargingPoints,
                    occupied: overlappingCount + 1,
                    available: Math.max(totalChargingPoints - (overlappingCount + 1), 0),
                },
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
