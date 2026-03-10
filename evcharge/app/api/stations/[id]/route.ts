import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import Slot from "@/models/Slot";
import Review from "@/models/Review";
import { getAuthUser } from "@/lib/auth";

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

        const slots = await Slot.find({ stationId: id });
        const reviews = await Review.find({ stationId: id }).populate(
            "userId",
            "name"
        );

        return NextResponse.json({ station, slots, reviews });
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

        // Admin can edit any station; owners can only edit their own
        const query = user.role === "ADMIN"
            ? { _id: id }
            : { _id: id, ownerId: user.userId };

        const station = await Station.findOneAndUpdate(
            query,
            body,
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

        // Clean up related data
        await Slot.deleteMany({ stationId: id });
        return NextResponse.json({ message: "Station deleted" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
