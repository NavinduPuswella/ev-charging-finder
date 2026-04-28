import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import Review from "@/models/Review";
import { getAuthUser } from "@/lib/auth";
import { getCurrentOccupancyForStation } from "@/lib/booking-availability";
import { sanitizeDescription, validateDescription } from "@/lib/station-description";

function normalizeChargerTypes(value: unknown) {
    if (Array.isArray(value)) {
        return value.filter((type): type is string => typeof type === "string" && type.trim().length > 0);
    }
    if (typeof value === "string" && value.trim().length > 0) {
        return value
            .split(",")
            .map((type) => type.trim())
            .filter(Boolean);
    }
    return [];
}

function getAvailabilityLabel(
    availableNow: number,
    totalChargingPoints: number,
    stationStatus?: "AVAILABLE" | "LIMITED" | "MAINTENANCE" | "INACTIVE"
) {
    if (stationStatus === "INACTIVE" || stationStatus === "MAINTENANCE") {
        return "Closed";
    }
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
        const isClosed =
            stationObj.status === "INACTIVE" || stationObj.status === "MAINTENANCE";
        const availableNow = isClosed ? 0 : Math.max(totalChargingPoints - occupiedNow, 0);

        return NextResponse.json({
            station: {
                ...stationObj,
                totalChargingPoints,
                totalSlots: totalChargingPoints,
                availableNow,
                occupiedNow,
                availabilityStatus: getAvailabilityLabel(
                    availableNow,
                    totalChargingPoints,
                    stationObj.status
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
        const chargerTypes =
            body.chargerType === undefined
                ? undefined
                : normalizeChargerTypes(body.chargerType);
        if (chargerTypes && chargerTypes.length === 0) {
            return NextResponse.json(
                { error: "At least one charger type is required." },
                { status: 400 }
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.address !== undefined) updateData.address = body.address;
        if (body.city !== undefined) updateData.city = body.city;
        if (body.description !== undefined) {
            const descriptionError = validateDescription(body.description);
            if (descriptionError) {
                return NextResponse.json({ error: descriptionError }, { status: 400 });
            }
            updateData.description = sanitizeDescription(body.description);
        }
        if (body.status !== undefined) updateData.status = body.status;
        if (body.pricePerKwh !== undefined) updateData.pricePerKwh = Number(body.pricePerKwh);
        if (body.reservationFeePerHour !== undefined) {
            const fee = Number(body.reservationFeePerHour);
            if (Number.isFinite(fee) && fee >= 0) {
                updateData.reservationFeePerHour = fee;
            }
        }
        if (chargerTypes) updateData.chargerType = chargerTypes.join(", ");
        if (Number.isFinite(totalChargingPoints)) {
            updateData.totalChargingPoints = totalChargingPoints;
            updateData.totalSlots = totalChargingPoints;
        }
        if (body.latitude !== undefined || body.longitude !== undefined) {
            updateData.location = {
                latitude: Number(body.latitude),
                longitude: Number(body.longitude),
            };
        } else if (body.location) {
            updateData.location = body.location;
        }

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
