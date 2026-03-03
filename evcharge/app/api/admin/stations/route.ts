import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();
        const stations = await Station.find()
            .populate("ownerId", "name email")
            .sort({ createdAt: -1 });

        return NextResponse.json({ stations });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();
        const body = await request.json();
        const { stationId, isApproved } = body;

        const station = await Station.findByIdAndUpdate(
            stationId,
            { isApproved },
            { new: true }
        );

        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        return NextResponse.json({
            station,
            message: isApproved ? "Station approved" : "Station rejected",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
