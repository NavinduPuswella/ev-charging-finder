import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import Slot from "@/models/Slot";
import Review from "@/models/Review";
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
        const { stationId, isApproved, status } = body;

        if (!stationId) {
            return NextResponse.json({ error: "stationId is required" }, { status: 400 });
        }

        const allowedStatuses = ["AVAILABLE", "LIMITED", "MAINTENANCE", "INACTIVE"];
        const updateData: { isApproved?: boolean; status?: string } = {};

        if (typeof isApproved === "boolean") {
            updateData.isApproved = isApproved;
        }

        if (typeof status === "string") {
            if (!allowedStatuses.includes(status)) {
                return NextResponse.json({ error: "Invalid station status" }, { status: 400 });
            }
            updateData.status = status;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "Provide at least one updatable field" },
                { status: 400 }
            );
        }

        const station = await Station.findByIdAndUpdate(
            stationId,
            updateData,
            { new: true }
        );

        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        let message = "Station updated";
        if (typeof status === "string") {
            message = status === "INACTIVE" ? "Station disabled" : "Station enabled";
        } else if (typeof isApproved === "boolean") {
            message = isApproved ? "Station approved" : "Station rejected";
        }

        return NextResponse.json({ station, message });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();
        const { searchParams } = new URL(request.url);
        const stationId = searchParams.get("stationId");

        if (!stationId) {
            return NextResponse.json({ error: "stationId is required" }, { status: 400 });
        }

        const station = await Station.findByIdAndDelete(stationId);
        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        await Slot.deleteMany({ stationId });
        await Review.deleteMany({ stationId });

        return NextResponse.json({ message: "Station deleted successfully" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
