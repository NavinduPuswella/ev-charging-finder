import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import { getAuthUser } from "@/lib/auth";
import { getRecommendedStations } from "@/lib/recommendation";
import { getCurrentOccupancyMap } from "@/lib/booking-availability";

export async function POST(request: Request) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();
        const body = await request.json();
        const { latitude, longitude, vehicleRange, chargerType } = body;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter: any = {
            isApproved: true,
            status: { $nin: ["INACTIVE", "MAINTENANCE"] },
        };
        if (chargerType) filter.chargerType = chargerType;

        const stations = await Station.find(filter);
        const occupancyMap = await getCurrentOccupancyMap(
            stations.map((station) => String(station._id))
        );

        const stationsWithAvailability = stations.map((station) => {
            const stationObj = station.toObject();
            const totalChargingPoints =
                stationObj.totalChargingPoints || stationObj.totalSlots || 0;
            const occupiedNow = occupancyMap.get(String(stationObj._id)) || 0;
            return {
                ...stationObj,
                totalSlotCount: totalChargingPoints,
                totalChargingPoints,
                availableSlots: Math.max(totalChargingPoints - occupiedNow, 0),
            };
        });

        const recommendations = getRecommendedStations({
            userLat: latitude,
            userLng: longitude,
            vehicleRange: vehicleRange || 200,
            stations: stationsWithAvailability as unknown as Parameters<typeof getRecommendedStations>[0]["stations"],
        });

        return NextResponse.json({
            recommendations: recommendations.map((r) => ({
                station: r.station,
                score: Math.round(r.score * 100) / 100,
                distanceKm: Math.round(r.distanceKm * 10) / 10,
            })),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
