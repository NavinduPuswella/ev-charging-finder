import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import Slot from "@/models/Slot";
import Review from "@/models/Review";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth";
import { sendStationApprovalEmail, sendStationRejectionEmail } from "@/lib/station-email";
import { sanitizeDescription, validateDescription } from "@/lib/station-description";

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

function normalizeChargerTypesValue(value: unknown) {
    if (Array.isArray(value)) {
        return value.filter(
            (type): type is string => typeof type === "string" && type.trim().length > 0
        );
    }
    if (typeof value === "string" && value.trim().length > 0) {
        return value
            .split(",")
            .map((type) => type.trim())
            .filter(Boolean);
    }
    return [];
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
        /
        const updateData: Record<string, any> = {};

        if (typeof isApproved === "boolean") {
            updateData.isApproved = isApproved;
        }

        if (typeof status === "string") {
            if (!allowedStatuses.includes(status)) {
                return NextResponse.json({ error: "Invalid station status" }, { status: 400 });
            }
            updateData.status = status;
        } else if (isApproved === true) {
            updateData.status = "AVAILABLE";
        }

        if (typeof body.name === "string") updateData.name = body.name;
        if (typeof body.city === "string") updateData.city = body.city;
        if (typeof body.address === "string") updateData.address = body.address;
        if (typeof body.description === "string") {
            const descriptionError = validateDescription(body.description);
            if (descriptionError) {
                return NextResponse.json({ error: descriptionError }, { status: 400 });
            }
            updateData.description = sanitizeDescription(body.description);
        }
        if (typeof body.contactPhone === "string") {
            updateData.contactPhone = body.contactPhone;
            updateData.requesterPhone = body.contactPhone;
        }
        if (typeof body.submitterName === "string") {
            updateData.submitterName = body.submitterName;
            updateData.requesterName = body.submitterName;
        }
        if (typeof body.submitterEmail === "string") {
            updateData.submitterEmail = body.submitterEmail;
            updateData.requesterEmail = body.submitterEmail;
        }
        if (typeof body.requesterName === "string") updateData.requesterName = body.requesterName;
        if (typeof body.requesterEmail === "string") updateData.requesterEmail = body.requesterEmail;
        if (typeof body.requesterPhone === "string") updateData.requesterPhone = body.requesterPhone;

        if (body.pricePerKwh !== undefined) {
            const price = Number(body.pricePerKwh);
            if (Number.isFinite(price) && price >= 0) {
                updateData.pricePerKwh = price;
            }
        }

        if (body.reservationFeePerHour !== undefined) {
            const fee = Number(body.reservationFeePerHour);
            if (Number.isFinite(fee) && fee >= 0) {
                updateData.reservationFeePerHour = fee;
            }
        }

        if (body.totalChargingPoints !== undefined || body.totalSlots !== undefined) {
            const points = Number(body.totalChargingPoints ?? body.totalSlots);
            if (Number.isFinite(points) && points >= 1) {
                updateData.totalChargingPoints = points;
                updateData.totalSlots = points;
            }
        }

        if (body.chargerType !== undefined) {
            const types = normalizeChargerTypesValue(body.chargerType);
            if (types.length === 0) {
                return NextResponse.json(
                    { error: "At least one charger type is required." },
                    { status: 400 }
                );
            }
            updateData.chargerType = types.join(", ");
        }

        if (body.latitude !== undefined && body.longitude !== undefined) {
            const lat = Number(body.latitude);
            const lng = Number(body.longitude);
            if (
                Number.isFinite(lat) &&
                Number.isFinite(lng) &&
                lat >= -90 &&
                lat <= 90 &&
                lng >= -180 &&
                lng <= 180
            ) {
                updateData.location = { latitude: lat, longitude: lng };
            } else {
                return NextResponse.json(
                    { error: "Invalid coordinates" },
                    { status: 400 }
                );
            }
        } else if (body.location && typeof body.location === "object") {
            updateData.location = body.location;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "Provide at least one updatable field" },
                { status: 400 }
            );
        }

        const previousStation = await Station.findById(stationId).select("isApproved").lean<{
            isApproved?: boolean;
        }>();
        const wasApproved = Boolean(previousStation?.isApproved);
        if (isApproved === true && !wasApproved) {
            updateData.approvedAt = new Date();
        }

        const station = await Station.findByIdAndUpdate(
            stationId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        if (isApproved === true && station.ownerId) {
            await User.updateOne(
                { _id: station.ownerId, role: "USER" },
                { $set: { role: "STATION_OWNER" } }
            );
        }

        const justApproved = isApproved === true && !wasApproved;
        const justRejected = isApproved === false && !wasApproved;
        let emailSent = false;
        if (justApproved) {
            try {
                await sendStationApprovalEmail(station);
                emailSent = true;
            } catch (err) {
                console.error("Failed to send station approval email:", err);
            }
        } else if (justRejected) {
            try {
                await sendStationRejectionEmail(station);
                emailSent = true;
            } catch (err) {
                console.error("Failed to send station rejection email:", err);
            }
        }

        let message = "Station updated";
        if (typeof isApproved === "boolean") {
            if (isApproved) {
                if (justApproved) {
                    message = emailSent
                        ? "Station approved and submitter notified by email."
                        : "Station approved (email notification failed — check SMTP config).";
                } else {
                    message = "Station updated";
                }
            } else {
                message = justRejected
                    ? emailSent
                        ? "Station rejected and submitter notified by email."
                        : "Station rejected (email notification failed - check SMTP config)."
                    : "Station rejected";
            }
        } else if (typeof status === "string") {
            message = status === "INACTIVE" ? "Station disabled" : "Station enabled";
        }

        return NextResponse.json({ station, message, emailSent });
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

        const shouldSendRejectionEmail = !station.isApproved;
        let emailSent = false;
        if (shouldSendRejectionEmail) {
            try {
                await sendStationRejectionEmail(station);
                emailSent = true;
            } catch (err) {
                console.error("Failed to send station rejection email:", err);
            }
        }

        await Slot.deleteMany({ stationId });
        await Review.deleteMany({ stationId });

        const message = shouldSendRejectionEmail
            ? emailSent
                ? "Submission rejected and submitter notified by email."
                : "Submission rejected (email notification failed - check SMTP config)."
            : "Station deleted successfully";

        return NextResponse.json({ message, emailSent });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
