import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Station from "@/models/Station";
import Booking from "@/models/Booking";
import Review from "@/models/Review";
import { getAuthUser } from "@/lib/auth";

type RangeKey = "today" | "week" | "month" | "year";

interface RangeInfo {
    start: Date;
    end: Date;
    buckets: { label: string; start: Date; end: Date }[];
}

function buildRange(range: RangeKey): RangeInfo {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (range === "today") {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const buckets: RangeInfo["buckets"] = [];
        for (let h = 0; h < 24; h += 3) {
            const bStart = new Date(start);
            bStart.setHours(h, 0, 0, 0);
            const bEnd = new Date(start);
            bEnd.setHours(h + 2, 59, 59, 999);
            buckets.push({ label: `${h.toString().padStart(2, "0")}:00`, start: bStart, end: bEnd });
        }
        return { start, end, buckets };
    }

    if (range === "week") {
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        const buckets: RangeInfo["buckets"] = [];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (let i = 0; i < 7; i++) {
            const bStart = new Date(start);
            bStart.setDate(bStart.getDate() + i);
            const bEnd = new Date(bStart);
            bEnd.setHours(23, 59, 59, 999);
            buckets.push({ label: dayNames[bStart.getDay()], start: bStart, end: bEnd });
        }
        return { start, end, buckets };
    }

    if (range === "month") {
        const start = new Date(now);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        const buckets: RangeInfo["buckets"] = [];
        for (let i = 0; i < 30; i++) {
            const bStart = new Date(start);
            bStart.setDate(bStart.getDate() + i);
            const bEnd = new Date(bStart);
            bEnd.setHours(23, 59, 59, 999);
            buckets.push({ label: `${bStart.getDate()}`, start: bStart, end: bEnd });
        }
        return { start, end, buckets };
    }

    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const buckets: RangeInfo["buckets"] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let m = 0; m < 12; m++) {
        const bStart = new Date(now.getFullYear(), m, 1, 0, 0, 0, 0);
        const bEnd = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59, 999);
        buckets.push({ label: monthNames[m], start: bStart, end: bEnd });
    }
    return { start, end, buckets };
}

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();

        const url = new URL(req.url);
        const rangeParam = (url.searchParams.get("range") || "month").toLowerCase() as RangeKey;
        const range: RangeKey = ["today", "week", "month", "year"].includes(rangeParam)
            ? rangeParam
            : "month";

        const { start: rangeStart, end: rangeEnd, buckets } = buildRange(range);

        const totalUsers = await User.countDocuments();
        const totalStations = await Station.countDocuments({ isApproved: true });
        const inactiveStations = await Station.countDocuments({ status: "INACTIVE" });
        const maintenanceStations = await Station.countDocuments({ status: "MAINTENANCE" });

        const bookingRangeFilter = { createdAt: { $gte: rangeStart, $lte: rangeEnd } };

        const totalBookings = await Booking.countDocuments(bookingRangeFilter);
        const pendingBookings = await Booking.countDocuments({
            ...bookingRangeFilter,
            status: "PENDING_PAYMENT",
        });
        const confirmedBookings = await Booking.countDocuments({
            ...bookingRangeFilter,
            status: "CONFIRMED",
        });
        const completedBookings = await Booking.countDocuments({
            ...bookingRangeFilter,
            status: "COMPLETED",
        });
        const cancelledBookings = await Booking.countDocuments({
            ...bookingRangeFilter,
            status: "CANCELLED",
        });

        const revenueResult = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: rangeStart, $lte: rangeEnd },
                    status: { $in: ["CONFIRMED", "COMPLETED"] },
                },
            },
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: { $ifNull: ["$totalReservationFee", "$amount"] },
                    },
                },
            },
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        const bookingsInRange = await Booking.find(
            { createdAt: { $gte: rangeStart, $lte: rangeEnd } },
            { createdAt: 1, amount: 1, totalReservationFee: 1, status: 1 }
        ).lean();

        const bookingsTrend = buckets.map((b) => {
            let count = 0;
            let revenue = 0;
            for (const bk of bookingsInRange) {
                const ts = new Date(bk.createdAt).getTime();
                if (ts >= b.start.getTime() && ts <= b.end.getTime()) {
                    count += 1;
                    if (bk.status === "CONFIRMED" || bk.status === "COMPLETED") {
                        revenue += bk.totalReservationFee
                            ?? bk.amount
                            ?? 0;
                    }
                }
            }
            return { label: b.label, bookings: count, revenue };
        });

        const mostBookedAgg = await Booking.aggregate([
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
                    _id: 1,
                    name: "$station.name",
                    city: "$station.city",
                    status: "$station.status",
                    rating: "$station.rating",
                    bookings: 1,
                },
            },
        ]);

        const recentBookings = await Booking.find({}, { stationName: 1, city: 1, status: 1, createdAt: 1, amount: 1, totalReservationFee: 1 })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const recentStations = await Station.find({}, { name: 1, city: 1, createdAt: 1, isApproved: 1, status: 1 })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const recentReviews = await Review.find({}, { rating: 1, comment: 1, createdAt: 1, stationId: 1 })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const recentUsers = await User.find({}, { name: 1, email: 1, role: 1, createdAt: 1 })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        type Activity = {
            type: "station_added" | "booking_created" | "booking_cancelled" | "review_submitted" | "user_registered" | "station_disabled";
            title: string;
            subtitle: string;
            timestamp: Date;
        };

        const activity: Activity[] = [];

        for (const s of recentStations) {
            if (s.status === "INACTIVE") {
                activity.push({
                    type: "station_disabled",
                    title: `Station disabled: ${s.name}`,
                    subtitle: s.city,
                    timestamp: new Date((s as { createdAt: Date }).createdAt),
                });
            } else {
                activity.push({
                    type: "station_added",
                    title: `New station added: ${s.name}`,
                    subtitle: s.city,
                    timestamp: new Date((s as { createdAt: Date }).createdAt),
                });
            }
        }

        for (const b of recentBookings) {
            if (b.status === "CANCELLED") {
                activity.push({
                    type: "booking_cancelled",
                    title: `Booking cancelled at ${b.stationName}`,
                    subtitle: b.city,
                    timestamp: new Date((b as { createdAt: Date }).createdAt),
                });
            } else {
                activity.push({
                    type: "booking_created",
                    title: `New booking at ${b.stationName}`,
                    subtitle: `${b.city} · LKR ${(b.totalReservationFee ?? b.amount ?? 0).toLocaleString()}`,
                    timestamp: new Date((b as { createdAt: Date }).createdAt),
                });
            }
        }

        for (const r of recentReviews) {
            activity.push({
                type: "review_submitted",
                title: `New ${r.rating}-star review`,
                subtitle: (r.comment || "").slice(0, 60) + ((r.comment || "").length > 60 ? "…" : ""),
                timestamp: new Date((r as { createdAt: Date }).createdAt),
            });
        }

        for (const u of recentUsers) {
            activity.push({
                type: "user_registered",
                title: `New ${u.role.toLowerCase().replace("_", " ")}: ${u.name}`,
                subtitle: u.email,
                timestamp: new Date((u as { createdAt: Date }).createdAt),
            });
        }

        activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const recentActivity = activity.slice(0, 8).map((a) => ({
            ...a,
            timestamp: a.timestamp.toISOString(),
        }));

        const flaggedReviews = await Review.countDocuments({ rating: { $lte: 2 } });
        const bookingsNeedingReview = await Booking.countDocuments({ status: "PENDING_PAYMENT" });
        const pendingSubmissions = await Station.countDocuments({ isApproved: false });

        return NextResponse.json({
            analytics: {
                range,
                totalUsers,
                totalStations,
                inactiveStations,
                maintenanceStations,
                totalBookings,
                pendingBookings,
                confirmedBookings,
                completedBookings,
                cancelledBookings,
                totalRevenue,
                bookingsTrend,
                mostBooked: mostBookedAgg,
                recentActivity,
                pendingActions: {
                    flaggedReviews,
                    disabledStations: inactiveStations,
                    bookingsNeedingReview,
                    pendingSubmissions,
                },
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
