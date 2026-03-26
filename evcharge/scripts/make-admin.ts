import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
}

const email = process.argv[2];
if (!email) {
    console.error("Usage: npx tsx scripts/make-admin.ts <email>");
    process.exit(1);
}

async function main() {
    await mongoose.connect(MONGODB_URI as string);
    const result = await mongoose.connection.db!.collection("users").findOneAndUpdate(
        { email: email.toLowerCase() },
        { $set: { role: "ADMIN" } },
        { returnDocument: "after" }
    );

    if (result) {
        console.log(`✅ User "${result.email}" is now ADMIN`);
    } else {
        console.error(`❌ No user found with email: ${email}`);
    }

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
