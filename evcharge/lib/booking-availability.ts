import Booking from "@/models/Booking";
import Slot from "@/models/Slot";
import Station from "@/models/Station";
import mongoose from "mongoose";

const ACTIVE_BOOKING_STATUS = ["CONFIRMED", "PENDING_PAYMENT"] as const;

export function buildDateTime(bookingDate: string, startTime: string) {
    return new Date(`${bookingDate}T${startTime}:00`);
}

/**
 * Validates that a bookingDate (YYYY-MM-DD string) falls within the allowed
 * booking window: from today (inclusive) to today + 1 year (inclusive).
 * Returns a user-friendly error message, or null if valid.
 */
export function validateBookingDateRange(bookingDate: string): string | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bookingDate);
    if (!match) return "Invalid booking date format.";

    const [, y, m, d] = match;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    if (Number.isNaN(parsed.getTime())) return "Invalid booking date.";
    parsed.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);


    const minAllowed = new Date(today);
    minAllowed.setDate(minAllowed.getDate() - 1);

    const max = new Date(today);
    max.setFullYear(max.getFullYear() + 1);
    max.setDate(max.getDate() + 1);

    if (parsed.getTime() < minAllowed.getTime()) {
        return "Booking date cannot be in the past.";
    }
    if (parsed.getTime() > max.getTime()) {
        return "Booking date must be within the next 12 months.";
    }
    return null;
}

export function addHours(date: Date, hours: number) {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function isBookingExpired(endTime: Date | string): boolean {
    return new Date(endTime).getTime() <= Date.now();
}

export function isCancellable(
    status: string,
    endTime: Date | string
): boolean {
    return status === "CONFIRMED" && !isBookingExpired(endTime);
}

export async function autoCompleteExpiredBookings(): Promise<number> {
    const result = await Booking.updateMany(
        {
            status: "CONFIRMED",
            endTime: { $lte: new Date() },
        },
        { $set: { status: "COMPLETED" } }
    );
    return result.modifiedCount;
}

export async function getOverlappingBookingCount(
    stationId: string,
    startTime: Date,
    endTime: Date
) {
    return Booking.countDocuments({
        stationId,
        status: { $in: ACTIVE_BOOKING_STATUS },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
    });
}

export async function getCurrentOccupancyMap(stationIds: string[]) {
    const now = new Date();
    const objectIds = stationIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
        return new Map<string, number>();
    }

    const occupancy = await Booking.aggregate([
        {
            $match: {
                stationId: { $in: objectIds },
                status: { $in: [...ACTIVE_BOOKING_STATUS] },
                startTime: { $lte: now },
                endTime: { $gt: now },
            },
        },
        { $group: { _id: "$stationId", count: { $sum: 1 } } },
    ]);

    return new Map<string, number>(
        occupancy.map((item) => [String(item._id), item.count])
    );
}

export async function getCurrentOccupancyForStation(stationId: string) {
    const now = new Date();
    return Booking.countDocuments({
        stationId,
        status: { $in: ACTIVE_BOOKING_STATUS },
        startTime: { $lte: now },
        endTime: { $gt: now },
    });
}

export async function syncStationSlotStatusesForWindow(
    stationId: string,
    startTime: Date,
    endTime: Date
) {
    const slots = await Slot.find({
        stationId,
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
    }).select("_id startTime endTime status");

    if (slots.length === 0) {
        return;
    }

    const updates = await Promise.all(
        slots.map(async (slot) => {
            const overlapCount = await Booking.countDocuments({
                stationId,
                status: { $in: ACTIVE_BOOKING_STATUS },
                startTime: { $lt: slot.endTime },
                endTime: { $gt: slot.startTime },
            });

            return {
                id: slot._id,
                status: (overlapCount > 0 ? "BOOKED" : "AVAILABLE") as
                    | "AVAILABLE"
                    | "BOOKED",
            };
        })
    );

    if (updates.length > 0) {
        await Promise.all(
            updates.map((item) =>
                Slot.updateOne({ _id: item.id }, { $set: { status: item.status } })
            )
        );
    }
}

export async function syncStationStatusFromAvailability(stationId: string) {
    const station = await Station.findById(stationId).select(
        "status totalChargingPoints totalSlots"
    );

    if (!station) {
        return;
    }

    if (station.status === "MAINTENANCE") {
        return;
    }

    const totalChargingPoints =
        station.totalChargingPoints || station.totalSlots || 0;

    if (totalChargingPoints <= 0) {
        return;
    }

    const occupiedNow = await getCurrentOccupancyForStation(stationId);
    const availableNow = Math.max(totalChargingPoints - occupiedNow, 0);

    let nextStatus: "AVAILABLE" | "LIMITED" | "INACTIVE" = "AVAILABLE";
    if (availableNow <= 0) {
        nextStatus = "INACTIVE";
    } else if (availableNow <= Math.max(1, Math.ceil(totalChargingPoints * 0.3))) {
        nextStatus = "LIMITED";
    }

    if (station.status !== nextStatus) {
        station.status = nextStatus;
        await station.save();
    }
}
