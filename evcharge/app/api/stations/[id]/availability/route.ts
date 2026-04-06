import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import {
    addHours,
    buildDateTime,
    getOverlappingBookingCount,
} from "@/lib/booking-availability";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        const bookingDate = String(body.bookingDate || "");
        const startTimeRaw = String(body.startTime || "");
        const durationHours = Number(body.durationHours || 1);

        if (!bookingDate || !startTimeRaw || durationHours < 1) {
            return NextResponse.json(
                {
                    error: "bookingDate, startTime and durationHours are required",
                },
                { status: 400 }
            );
        }

        if (durationHours > 5) {
            return NextResponse.json(
                { error: "Maximum booking duration is 5 hours." },
                { status: 400 }
            );
        }

        const station = await Station.findById(id);
        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        if (!station.isApproved || station.status === "INACTIVE" || station.status === "MAINTENANCE") {
            const totalChargingPoints = station.totalChargingPoints || station.totalSlots;
            return NextResponse.json({
                totalChargingPoints,
                availablePoints: 0,
                occupiedPoints: totalChargingPoints,
                canBook: false,
                bookingWindow: null,
                reason: "Station is currently closed",
            });
        }

        const startDateTime = buildDateTime(bookingDate, startTimeRaw);
        if (Number.isNaN(startDateTime.getTime())) {
            return NextResponse.json({ error: "Invalid date or start time" }, { status: 400 });
        }

        const endDateTime = addHours(startDateTime, durationHours);
        const totalChargingPoints = station.totalChargingPoints || station.totalSlots;
        const overlappingBookings = await getOverlappingBookingCount(
            id,
            startDateTime,
            endDateTime
        );
        const availablePoints = Math.max(totalChargingPoints - overlappingBookings, 0);

        return NextResponse.json({
            totalChargingPoints,
            availablePoints,
            occupiedPoints: overlappingBookings,
            canBook: availablePoints > 0,
            bookingWindow: {
                startTime: startDateTime,
                endTime: endDateTime,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
