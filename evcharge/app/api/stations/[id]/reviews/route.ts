import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Review from "@/models/Review";
import Booking from "@/models/Booking";
import Station from "@/models/Station";
import { getAuthUser } from "@/lib/auth";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const reviews = await Review.find({ stationId: id })
            .populate("userId", "name")
            .sort({ createdAt: -1 });
        return NextResponse.json({ reviews });
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
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();
        const { id } = await params;

        // Check if user has a completed booking at this station
        const completedBooking = await Booking.findOne({
            userId: user.userId,
            stationId: id,
            status: "COMPLETED",
        });

        if (!completedBooking) {
            return NextResponse.json(
                { error: "You can only review stations where you have a completed booking" },
                { status: 403 }
            );
        }

        // Check for existing review
        const existingReview = await Review.findOne({
            userId: user.userId,
            stationId: id,
        });

        if (existingReview) {
            return NextResponse.json(
                { error: "You have already reviewed this station" },
                { status: 409 }
            );
        }

        const body = await request.json();
        const review = await Review.create({
            userId: user.userId,
            stationId: id,
            rating: body.rating,
            comment: body.comment,
        });

        // Update station average rating
        const allReviews = await Review.find({ stationId: id });
        const avgRating =
            allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await Station.findByIdAndUpdate(id, {
            rating: Math.round(avgRating * 10) / 10,
        });

        return NextResponse.json({ review }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
