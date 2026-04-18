import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vehicle from "@/models/Vehicle";
import { getAuthUser } from "@/lib/auth";
import { validateVehicleInput } from "@/lib/vehicle-validation";

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
            { _id: id, userId: user.userId },
            validation.normalized,
            { new: true, runValidators: true }
        );

        if (!vehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }

        return NextResponse.json({ vehicle });
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

        const vehicle = await Vehicle.findOneAndDelete({
            _id: id,
            userId: user.userId,
        });

        if (!vehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Vehicle deleted" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
