import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Slot from "@/models/Slot";
import Station from "@/models/Station";
import { getAuthUser } from "@/lib/auth";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const slots = await Slot.find({ stationId: id }).sort({ startTime: 1 });
        return NextResponse.json({ slots });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user || (user.role !== "STATION_OWNER" && user.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();
        const { id } = await params;

        // Verify station ownership
        const station = await Station.findOne({ _id: id, ownerId: user.userId });
        if (!station && user.role !== "ADMIN") {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        const body = await request.json();
        const slots = Array.isArray(body) ? body : [body];

        const createdSlots = await Slot.insertMany(
            slots.map((s) => ({ ...s, stationId: id, status: "AVAILABLE" }))
        );

        return NextResponse.json({ slots: createdSlots }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
