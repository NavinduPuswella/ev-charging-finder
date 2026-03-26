import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import Review from "@/models/Review";
import { getAuthUser } from "@/lib/auth";
import { getCurrentOccupancyForStation } from "@/lib/booking-availability";

function getAvailabilityLabel(availableNow: number, totalChargingPoints: number) {
    if (availableNow <= 0) return "Fully Booked";
    if (availableNow <= Math.max(1, Math.ceil(totalChargingPoints * 0.3))) {
        return "Limited Availability";
    }
    return "Available";
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const station = await Station.findById(id).populate("ownerId", "name email");
        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        const reviews = await Review.find({ stationId: id }).populate(
            "userId",
            "name"
        );

        const stationObj = station.toObject();
        const totalChargingPoints =
            stationObj.totalChargingPoints || stationObj.totalSlots || 0;
        const occupiedNow = await getCurrentOccupancyForStation(id);
        const availableNow = Math.max(totalChargingPoints - occupiedNow, 0);

        return NextResponse.json({
            station: {
                ...stationObj,
                totalChargingPoints,
                totalSlots: totalChargingPoints,
                availableNow,
                occupiedNow,
                availabilityStatus: getAvailabilityLabel(
                    availableNow,
                    totalChargingPoints
                ),
            },
            reviews,
            availability: {
                totalChargingPoints,
                availableNow,
                occupiedNow,
            },
            slots: [],
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

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
        const totalChargingPoints = Number(
            body.totalChargingPoints ?? body.totalSlots
        );
        const updateData = {
            ...body,
            totalChargingPoints: Number.isFinite(totalChargingPoints)
                ? totalChargingPoints
                : undefined,
            totalSlots: Number.isFinite(totalChargingPoints)
                ? totalChargingPoints
                : undefined,
            location:
                body.latitude !== undefined || body.longitude !== undefined
                    ? {
                        latitude: Number(body.latitude),
                        longitude: Number(body.longitude),
                    }
                    : body.location,
        };

        const query = user.role === "ADMIN"
            ? { _id: id }
            : { _id: id, ownerId: user.userId };

        const station = await Station.findOneAndUpdate(
            query,
            updateData,
            { new: true, runValidators: true }
        );

        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        return NextResponse.json({ station });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();
        const { id } = await params;

        const station = await Station.findOneAndDelete({
            _id: id,
            ownerId: user.userId,
        });

        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Station deleted" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
