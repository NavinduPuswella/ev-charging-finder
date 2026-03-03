import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import Slot from "@/models/Slot";
import { getAuthUser } from "@/lib/auth";

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter: any = { isApproved: true };

        if (city) filter.city = new RegExp(city, "i");
        if (chargerType) filter.chargerType = chargerType;

        let stations = await Station.find(filter).populate("ownerId", "name email");

        // Distance filter if lat/lng provided
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

        // Filter by available slots
        if (availableOnly) {
            const stationIds = stations.map((s) => s._id);
            const availableSlots = await Slot.aggregate([
                { $match: { stationId: { $in: stationIds }, status: "AVAILABLE" } },
                { $group: { _id: "$stationId", count: { $sum: 1 } } },
            ]);
            const availableMap = new Map(
                availableSlots.map((s) => [s._id.toString(), s.count])
            );
            stations = stations.filter(
                (s) => (availableMap.get(s._id.toString()) || 0) > 0
            );
        }

        return NextResponse.json({ stations });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "STATION_OWNER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();
        const body = await request.json();
        const station = await Station.create({
            ...body,
            ownerId: user.userId,
            isApproved: false,
        });

        return NextResponse.json(
            { station, message: "Station created. Awaiting admin approval." },
            { status: 201 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
