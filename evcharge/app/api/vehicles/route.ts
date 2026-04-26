import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Vehicle from "@/models/Vehicle";
import { getAuthUser } from "@/lib/auth";
import { validateVehicleInput } from "@/lib/vehicle-validation";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();
        const userOid = new mongoose.Types.ObjectId(user.userId);
        const vehicles = await Vehicle.find({ userId: userOid })
            .sort({ isPrimary: -1, createdAt: -1 })
            .lean();
        return NextResponse.json({
            vehicles: vehicles.map((v) => ({
                ...v,
                _id: v._id.toString(),
                userId: v.userId.toString(),
                isPrimary: Boolean(v.isPrimary),
            })),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();
        const body = await request.json();
        const validation = validateVehicleInput({
            selectedModelId: body.selectedModelId,
            brand: body.brand,
            model: body.model,
            vehicleType: body.vehicleType,
            batteryCapacity: Number(body.batteryCapacity),
            rangeKm: Number(body.rangeKm),
            chargingType: body.chargingType,
            chargingSpeedKw:
                body.chargingSpeedKw === "" || body.chargingSpeedKw === undefined
                    ? undefined
                    : Number(body.chargingSpeedKw),
        });

        if (!validation.isValid || !validation.normalized) {
            return NextResponse.json(
                {
                    error: "Vehicle validation failed",
                    errors: validation.errors,
                    helper: validation.helper,
                },
                { status: 400 }
            );
        }

        const userOid = new mongoose.Types.ObjectId(user.userId);
        const existingCount = await Vehicle.countDocuments({ userId: userOid });

        const vehicle = await Vehicle.create({
            ...validation.normalized,
            userId: userOid,
            isPrimary: existingCount === 0,
        });

        return NextResponse.json(
            {
                vehicle: {
                    ...vehicle.toObject(),
                    _id: vehicle._id.toString(),
                    userId: vehicle.userId.toString(),
                    isPrimary: Boolean(vehicle.isPrimary),
                },
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
