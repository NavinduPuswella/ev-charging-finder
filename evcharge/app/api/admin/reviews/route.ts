import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Review from "@/models/Review";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const stationId = searchParams.get("stationId");
        const rating = searchParams.get("rating");
        const month = searchParams.get("month");

        const filter: Record<string, unknown> = {};

        if (stationId) {
            filter.stationId = stationId;
        }

        if (rating) {
            const ratingNum = Number(rating);
            if (ratingNum >= 1 && ratingNum <= 5) {
                filter.rating = ratingNum;
            }
        }

        if (month) {
            const [year, mon] = month.split("-").map(Number);
            if (year && mon) {
                const start = new Date(year, mon - 1, 1);
                const end = new Date(year, mon, 1);
                filter.createdAt = { $gte: start, $lt: end };
            }
        }

        const reviews = await Review.find(filter)
            .populate("userId", "name email")
            .populate("stationId", "name city")
            .sort({ createdAt: -1 });

        return NextResponse.json({ reviews });
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
        const reviewId = searchParams.get("id");

        if (!reviewId) {
            return NextResponse.json({ error: "Review ID required" }, { status: 400 });
        }

        const review = await Review.findByIdAndDelete(reviewId);
        if (!review) {
            return NextResponse.json({ error: "Review not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Review deleted" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
