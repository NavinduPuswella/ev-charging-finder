import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Station from "@/models/Station";
import Booking from "@/models/Booking";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();

        const totalUsers = await User.countDocuments();
        const totalStations = await Station.countDocuments({ isApproved: true });
        const pendingStations = await Station.countDocuments({ isApproved: false });
        const totalBookings = await Booking.countDocuments();
        const completedBookings = await Booking.countDocuments({ status: "COMPLETED" });
        const cancelledBookings = await Booking.countDocuments({ status: "CANCELLED" });

        // Revenue
        const revenueResult = await Booking.aggregate([
            { $match: { paymentStatus: "PAID" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        // Most booked stations
        const mostBooked = await Booking.aggregate([
            { $group: { _id: "$stationId", bookings: { $sum: 1 } } },
            { $sort: { bookings: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "stations",
                    localField: "_id",
                    foreignField: "_id",
                    as: "station",
                },
            },
            { $unwind: "$station" },
            {
                $project: {
                    name: "$station.name",
                    city: "$station.city",
                    bookings: 1,
                },
            },
        ]);

        // Peak booking hours
        const peakHours = await Booking.aggregate([
            {
                $group: {
                    _id: { $hour: "$date" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
        ]);

        // Users by role
        const usersByRole = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } },
        ]);

        return NextResponse.json({
            analytics: {
                totalUsers,
                totalStations,
                pendingStations,
                totalBookings,
                completedBookings,
                cancelledBookings,
                totalRevenue,
                mostBooked,
                peakHours: peakHours.map((h) => ({ hour: h._id, count: h.count })),
                usersByRole: usersByRole.reduce(
                    (acc, u) => ({ ...acc, [u._id]: u.count }),
                    {}
                ),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
