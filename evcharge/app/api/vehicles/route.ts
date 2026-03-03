import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vehicle from "@/models/Vehicle";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        await dbConnect();
        const vehicles = await Vehicle.find({ userId: user.userId });
        return NextResponse.json({ vehicles });
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
        const vehicle = await Vehicle.create({
            ...body,
            userId: user.userId,
        });

        return NextResponse.json({ vehicle }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
