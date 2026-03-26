import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined in .env.local");
    process.exit(1);
}


const UserSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false },
        role: { type: String, enum: ["USER", "STATION_OWNER", "ADMIN"], default: "USER" },
    },
    { timestamps: true }
);

const StationSchema = new mongoose.Schema(
    {
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true, trim: true },
        location: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true },
        },
        city: { type: String, required: true, trim: true },
        chargerType: { type: String, enum: ["Type1", "Type2", "CCS", "CHAdeMO", "Tesla"], required: true },
        totalSlots: { type: Number, required: true, min: 1 },
        pricePerKwh: { type: Number, required: true, min: 0 },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        isApproved: { type: Boolean, default: false },
        address: { type: String, trim: true },
        description: { type: String, trim: true },
    },
    { timestamps: true }
);

const SlotSchema = new mongoose.Schema(
    {
        stationId: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true },
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        status: { type: String, enum: ["AVAILABLE", "BOOKED"], default: "AVAILABLE" },
    },
    { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Station = mongoose.models.Station || mongoose.model("Station", StationSchema);
const Slot = mongoose.models.Slot || mongoose.model("Slot", SlotSchema);

async function seed() {
    console.log("🔌 Connecting to MongoDB...");
    console.log(`   URI: ${MONGODB_URI!.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}`);

    try {
        await mongoose.connect(MONGODB_URI!);
        console.log("✅ Connected to MongoDB successfully!\n");
    } catch (error) {
        console.error("❌ Failed to connect to MongoDB:");
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }

    const dbName = mongoose.connection.db?.databaseName;
    console.log(`📦 Database: ${dbName}\n`);

    console.log("👤 Creating Admin user...");
    const adminPassword = await bcrypt.hash("admin123", 12);
    const admin = await User.findOneAndUpdate(
        { email: "admin@evcharge.com" },
        {
            name: "Admin User",
            email: "admin@evcharge.com",
            password: adminPassword,
            role: "ADMIN",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`   ✅ Admin: admin@evcharge.com / admin123  (ID: ${admin._id})\n`);

    console.log("👤 Creating Station Owner user...");
    const ownerPassword = await bcrypt.hash("owner123", 12);
    const owner = await User.findOneAndUpdate(
        { email: "owner@evcharge.com" },
        {
            name: "Station Owner",
            email: "owner@evcharge.com",
            password: ownerPassword,
            role: "STATION_OWNER",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`   ✅ Owner: owner@evcharge.com / owner123  (ID: ${owner._id})\n`);

    console.log("👤 Creating Regular user...");
    const userPassword = await bcrypt.hash("user123", 12);
    const regularUser = await User.findOneAndUpdate(
        { email: "user@evcharge.com" },
        {
            name: "Test User",
            email: "user@evcharge.com",
            password: userPassword,
            role: "USER",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`   ✅ User: user@evcharge.com / user123  (ID: ${regularUser._id})\n`);

    console.log("⚡ Creating sample stations...");

    const stationsData = [
        {
            ownerId: owner._id,
            name: "Colombo Central Charging Hub",
            location: { latitude: 6.9271, longitude: 79.8612 },
            city: "Colombo",
            chargerType: "CCS",
            totalSlots: 4,
            pricePerKwh: 45,
            rating: 4.5,
            isApproved: true,
            address: "123 Galle Road, Colombo 03",
            description: "Fast charging station in the heart of Colombo with 4 CCS connectors.",
        },
        {
            ownerId: owner._id,
            name: "Kandy EV Power Station",
            location: { latitude: 7.2906, longitude: 80.6337 },
            city: "Kandy",
            chargerType: "Type2",
            totalSlots: 3,
            pricePerKwh: 38,
            rating: 4.2,
            isApproved: true,
            address: "45 Peradeniya Road, Kandy",
            description: "Reliable Type 2 charging near the Kandy lake area.",
        },
        {
            ownerId: owner._id,
            name: "Galle Fort Quick Charge",
            location: { latitude: 6.0329, longitude: 80.2168 },
            city: "Galle",
            chargerType: "CHAdeMO",
            totalSlots: 2,
            pricePerKwh: 42,
            rating: 4.0,
            isApproved: true,
            address: "12 Church Street, Galle Fort",
            description: "CHAdeMO fast charger located near the historic Galle Fort.",
        },
    ];

    for (const stationData of stationsData) {
        const station = await Station.findOneAndUpdate(
            { name: stationData.name },
            stationData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`   ✅ Station: ${station.name} (${station.city})`);

        const now = new Date();
        for (let i = 0; i < station.totalSlots; i++) {
            const startTime = new Date(now);
            startTime.setHours(8 + i * 2, 0, 0, 0);
            const endTime = new Date(startTime);
            endTime.setHours(startTime.getHours() + 2);

            await Slot.findOneAndUpdate(
                { stationId: station._id, startTime },
                {
                    stationId: station._id,
                    startTime,
                    endTime,
                    status: "AVAILABLE",
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }
        console.log(`      📋 Created ${station.totalSlots} time slots`);
    }

    const userCount = await User.countDocuments();
    const stationCount = await Station.countDocuments();
    const slotCount = await Slot.countDocuments();

    console.log("\n" + "═".repeat(50));
    console.log("🎉 Database seeded successfully!");
    console.log("═".repeat(50));
    console.log(`   Users:    ${userCount}`);
    console.log(`   Stations: ${stationCount}`);
    console.log(`   Slots:    ${slotCount}`);
    console.log("═".repeat(50));
    console.log("\n📌 Test Accounts:");
    console.log("   Admin:         admin@evcharge.com / admin123");
    console.log("   Station Owner: owner@evcharge.com / owner123");
    console.log("   Regular User:  user@evcharge.com  / user123");
    console.log("");

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
    process.exit(0);
}

seed().catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
});
