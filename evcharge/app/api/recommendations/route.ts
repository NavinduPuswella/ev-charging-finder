import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import Slot from "@/models/Slot";
import { getAuthUser } from "@/lib/auth";
import { getRecommendedStations } from "@/lib/recommendation";

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
        const filter: any = { isApproved: true };
        if (chargerType) filter.chargerType = chargerType;

        const stations = await Station.find(filter);

        // Get slot availability for each station
        const stationsWithSlots = await Promise.all(
            stations.map(async (station) => {
                const totalSlots = await Slot.countDocuments({ stationId: station._id });
                const availableSlots = await Slot.countDocuments({
                    stationId: station._id,
                    status: "AVAILABLE",
                });
                return {
                    ...station.toObject(),
                    totalSlotCount: totalSlots,
                    availableSlots,
                };
            })
        );

        const recommendations = getRecommendedStations({
            userLat: latitude,
            userLng: longitude,
            vehicleRange: vehicleRange || 200,
            stations: stationsWithSlots as unknown as Parameters<typeof getRecommendedStations>[0]["stations"],
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
