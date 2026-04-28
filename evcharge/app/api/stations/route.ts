import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import { getAuthUser } from "@/lib/auth";
import { getCurrentOccupancyMap } from "@/lib/booking-availability";
import { sanitizeDescription, validateDescription } from "@/lib/station-description";

function normalizeChargerTypes(value: unknown) {
    if (Array.isArray(value)) {
        return value.filter((type): type is string => typeof type === "string" && type.trim().length > 0);
    }
    if (typeof value === "string" && value.trim().length > 0) {
        return value
            .split(",")
            .map((type) => type.trim())
            .filter(Boolean);
    }
    return [];
}

function getAvailabilityLabel(
    availableNow: number,
    totalChargingPoints: number,
    stationStatus?: "AVAILABLE" | "LIMITED" | "MAINTENANCE" | "INACTIVE"
) {
    if (stationStatus === "INACTIVE" || stationStatus === "MAINTENANCE") {
        return "Closed";
    }
    if (availableNow <= 0) return "Fully Booked";
    if (availableNow <= Math.max(1, Math.ceil(totalChargingPoints * 0.3))) {
        return "Limited Availability";
    }
    return "Available";
}

export async function GET(request: Request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const city = searchParams.get("city");
        const chargerType = searchParams.get("chargerType");
        const lat = searchParams.get("lat");
        const lng = searchParams.get("lng");
        const radius = parseFloat(searchParams.get("radius") || "50");
        const availableOnly = searchParams.get("availableOnly") === "true";
        const all = searchParams.get("all") === "true";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter: any = all ? {} : { isApproved: true };

        if (city) filter.city = new RegExp(city, "i");
        if (chargerType) filter.chargerType = { $regex: chargerType, $options: "i" };

        let stations = await Station.find(filter).populate("ownerId", "name email");

        if (lat && lng) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            stations = stations.filter((station) => {
                const R = 6371;
                const dLat =
                    ((station.location.latitude - userLat) * Math.PI) / 180;
                const dLng =
                    ((station.location.longitude - userLng) * Math.PI) / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((userLat * Math.PI) / 180) *
                    Math.cos((station.location.latitude * Math.PI) / 180) *
                    Math.sin(dLng / 2) *
                    Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c <= radius;
            });
        }

        const occupancyMap = await getCurrentOccupancyMap(
            stations.map((s) => String(s._id))
        );

        const stationsWithAvailability = stations
            .map((station) => {
                const stationObj = station.toObject();
                const totalChargingPoints =
                    stationObj.totalChargingPoints || stationObj.totalSlots || 0;
                const occupiedNow = occupancyMap.get(String(stationObj._id)) || 0;
                const isClosed =
                    stationObj.status === "INACTIVE" || stationObj.status === "MAINTENANCE";
                const availableNow = isClosed
                    ? 0
                    : Math.max(totalChargingPoints - occupiedNow, 0);

                return {
                    ...stationObj,
                    totalChargingPoints,
                    totalSlots: totalChargingPoints,
                    availableNow,
                    occupiedNow,
                    availabilityStatus: getAvailabilityLabel(
                        availableNow,
                        totalChargingPoints,
                        stationObj.status
                    ),
                };
            })
            .filter((station) => (availableOnly ? station.availableNow > 0 : true));

        return NextResponse.json({ stations: stationsWithAvailability });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d][\d\s-]{6,16}$/;

export async function POST(request: Request) {
    try {
        const user = await getAuthUser();

        await dbConnect();
        const body = await request.json();
        const totalChargingPoints = Number(
            body.totalChargingPoints ?? body.totalSlots
        );
        const latitude = Number(body.latitude ?? body.location?.latitude);
        const longitude = Number(body.longitude ?? body.location?.longitude);

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            return NextResponse.json(
                { error: "Invalid station coordinates. Please provide valid latitude and longitude." },
                { status: 400 }
            );
        }

        const isAdmin = user?.role === "ADMIN";
        const isAuthenticated = Boolean(user);
        const chargerTypes = normalizeChargerTypes(body.chargerType);
        if (chargerTypes.length === 0) {
            return NextResponse.json(
                { error: "At least one charger type is required." },
                { status: 400 }
            );
        }

        const contactPhoneRaw =
            typeof body.contactPhone === "string" ? body.contactPhone.trim() : "";
        const submitterNameRaw =
            typeof body.submitterName === "string" ? body.submitterName.trim() : "";
        const submitterEmailRaw =
            typeof body.submitterEmail === "string" ? body.submitterEmail.trim().toLowerCase() : "";

        if (!isAuthenticated) {
            if (!submitterNameRaw || submitterNameRaw.length < 2) {
                return NextResponse.json(
                    { error: "Your name is required (min 2 characters)." },
                    { status: 400 }
                );
            }
            if (!submitterEmailRaw || !EMAIL_REGEX.test(submitterEmailRaw)) {
                return NextResponse.json(
                    { error: "A valid email address is required." },
                    { status: 400 }
                );
            }
            if (!contactPhoneRaw || !PHONE_REGEX.test(contactPhoneRaw)) {
                return NextResponse.json(
                    { error: "A valid contact phone number is required." },
                    { status: 400 }
                );
            }
        } else if (contactPhoneRaw && !PHONE_REGEX.test(contactPhoneRaw)) {
            return NextResponse.json(
                { error: "Contact phone is not a valid number." },
                { status: 400 }
            );
        }

        const descriptionError = validateDescription(body.description);
        if (descriptionError) {
            return NextResponse.json({ error: descriptionError }, { status: 400 });
        }
        const cleanDescription = sanitizeDescription(body.description) || undefined;

        const reservationFeePerHour =
            body.reservationFeePerHour !== undefined
                ? Number(body.reservationFeePerHour)
                : 100;

        const station = await Station.create({
            name: body.name,
            city: body.city,
            address: body.address,
            chargerType: chargerTypes.join(", "),
            pricePerKwh: Number(body.pricePerKwh),
            reservationFeePerHour,
            totalChargingPoints,
            totalSlots: totalChargingPoints,
            status: body.status || "AVAILABLE",
            description: cleanDescription,
            contactPhone: contactPhoneRaw || undefined,
            submitterName: !isAdmin ? submitterNameRaw || user?.name : undefined,
            submitterEmail: !isAdmin ? submitterEmailRaw || user?.email : undefined,
            location: {
                latitude,
                longitude,
            },
            ownerId: body.ownerId || (user ? user.userId : undefined),
            isApproved: isAdmin ? true : false,
            submittedAt: isAdmin ? undefined : new Date(),
            approvedAt: isAdmin ? new Date() : undefined,
            source: isAdmin
                ? "admin"
                : isAuthenticated
                    ? "owner_submission"
                    : "guest_submission",
            requesterName: isAdmin ? undefined : submitterNameRaw || user?.name,
            requesterEmail: isAdmin ? undefined : submitterEmailRaw || user?.email,
            requesterPhone: contactPhoneRaw || undefined,
            requesterUserId: !isAdmin && user ? user.userId : undefined,
            requesterAccountStatus: isAdmin
                ? "Admin Added"
                : isAuthenticated
                    ? "Registered User"
                    : "Guest / No Account",
        });

        return NextResponse.json(
            {
                station,
                message: isAdmin
                    ? "Station created and approved."
                    : "Submission received. Our admin team will review your station soon.",
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
