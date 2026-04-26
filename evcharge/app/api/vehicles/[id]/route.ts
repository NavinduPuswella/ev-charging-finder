import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Vehicle from "@/models/Vehicle";
import { getAuthUser } from "@/lib/auth";
import { validateVehicleInput } from "@/lib/vehicle-validation";

function isSetPrimaryBody(body: unknown): body is { isPrimary: true } {
    if (!body || typeof body !== "object") return false;
    const b = body as Record<string, unknown>;
    const keys = Object.keys(b);
    return keys.length === 1 && keys[0] === "isPrimary" && b.isPrimary === true;
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
        const userOid = new mongoose.Types.ObjectId(user.userId);

        if (isSetPrimaryBody(body)) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return NextResponse.json({ error: "Invalid vehicle id" }, { status: 400 });
            }
            const vehicleOid = new mongoose.Types.ObjectId(id);
            await Vehicle.updateMany(
                { userId: userOid, _id: { $ne: vehicleOid } },
                { $set: { isPrimary: false } }
            );
            const updated = await Vehicle.findOneAndUpdate(
                { _id: vehicleOid, userId: userOid },
                { $set: { isPrimary: true } },
                { new: true, runValidators: true }
            );
            if (!updated) {
                return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
            }
            return NextResponse.json({
                vehicle: {
                    ...updated.toObject(),
                    _id: updated._id.toString(),
                    userId: updated.userId.toString(),
                    isPrimary: true,
                },
            });
        }

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

        const vehicle = await Vehicle.findOneAndUpdate(
            { _id: id, userId: userOid },
            validation.normalized,
            { new: true, runValidators: true }
        );

        if (!vehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }

        return NextResponse.json({
            vehicle: {
                ...vehicle.toObject(),
                _id: vehicle._id.toString(),
                userId: vehicle.userId.toString(),
                isPrimary: Boolean(vehicle.isPrimary),
            },
        });
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

        const userOid = new mongoose.Types.ObjectId(user.userId);
        const vehicle = await Vehicle.findOneAndDelete({
            _id: id,
            userId: userOid,
        });

        if (!vehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }

        if (vehicle.isPrimary) {
            const nextPrimary = await Vehicle.findOne({ userId: userOid }).sort({
                createdAt: -1,
            });
            if (nextPrimary) {
                nextPrimary.isPrimary = true;
                await nextPrimary.save();
            }
        }

        return NextResponse.json({ message: "Vehicle deleted" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
