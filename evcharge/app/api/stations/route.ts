import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import { getAuthUser } from "@/lib/auth";
import { getCurrentOccupancyMap } from "@/lib/booking-availability";

function getAvailabilityLabel(availableNow: number, totalChargingPoints: number) {
    if (availableNow <= 0) return "Fully Booked";
    if (availableNow <= Math.max(1, Math.ceil(totalChargingPoints * 0.3))) {
        return "Limited Availability";
    }
    return "Available";
}

export async function GET(request: Request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const city = searchParams.get("city");
        const chargerType = searchParams.get("chargerType");
        const lat = searchParams.get("lat");
        const lng = searchParams.get("lng");
        const radius = parseFloat(searchParams.get("radius") || "50");
        const availableOnly = searchParams.get("availableOnly") === "true";
        const all = searchParams.get("all") === "true";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter: any = all ? {} : { isApproved: true };

        if (city) filter.city = new RegExp(city, "i");
        if (chargerType) filter.chargerType = chargerType;

        let stations = await Station.find(filter).populate("ownerId", "name email");

        if (lat && lng) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            stations = stations.filter((station) => {
                const R = 6371;
                const dLat =
                    ((station.location.latitude - userLat) * Math.PI) / 180;
                const dLng =
                    ((station.location.longitude - userLng) * Math.PI) / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((userLat * Math.PI) / 180) *
                    Math.cos((station.location.latitude * Math.PI) / 180) *
                    Math.sin(dLng / 2) *
                    Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c <= radius;
            });
        }

        const occupancyMap = await getCurrentOccupancyMap(
            stations.map((s) => String(s._id))
        );

        const stationsWithAvailability = stations
            .map((station) => {
                const stationObj = station.toObject();
                const totalChargingPoints =
                    stationObj.totalChargingPoints || stationObj.totalSlots || 0;
                const occupiedNow = occupancyMap.get(String(stationObj._id)) || 0;
                const availableNow = Math.max(totalChargingPoints - occupiedNow, 0);

                return {
                    ...stationObj,
                    totalChargingPoints,
                    totalSlots: totalChargingPoints,
                    availableNow,
                    occupiedNow,
                    availabilityStatus: getAvailabilityLabel(
                        availableNow,
                        totalChargingPoints
                    ),
                };
            })
            .filter((station) => (availableOnly ? station.availableNow > 0 : true));

        return NextResponse.json({ stations: stationsWithAvailability });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthUser();
        if (!user || (user.role !== "STATION_OWNER" && user.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();
        const body = await request.json();
        const totalChargingPoints = Number(
            body.totalChargingPoints ?? body.totalSlots
        );
        const latitude = Number(body.latitude ?? body.location?.latitude);
        const longitude = Number(body.longitude ?? body.location?.longitude);

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            return NextResponse.json(
                { error: "Invalid station coordinates. Please provide valid latitude and longitude." },
                { status: 400 }
            );
        }

        const isAdmin = user.role === "ADMIN";

        const station = await Station.create({
            name: body.name,
            city: body.city,
            address: body.address,
            chargerType: body.chargerType,
            pricePerKwh: Number(body.pricePerKwh),
            totalChargingPoints,
            totalSlots: totalChargingPoints,
            status: body.status || "AVAILABLE",
            description: body.description,
            location: {
                latitude,
                longitude,
            },
            ownerId: body.ownerId || user.userId,
            isApproved: isAdmin ? true : false,
        });

        return NextResponse.json(
            { station, message: isAdmin ? "Station created and approved." : "Station created. Awaiting admin approval." },
            { status: 201 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
