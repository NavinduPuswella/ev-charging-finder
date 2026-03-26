import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export interface AuthUser {
    userId: string;
    email: string;
    role: "USER" | "STATION_OWNER" | "ADMIN";
    clerkId: string;
}

export async function getAuthUser(): Promise<AuthUser | null> {
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;

    await dbConnect();

    let user = await User.findOne({ clerkId });

    if (!user) {
        const clerkUser = await currentUser();
        if (!clerkUser) return null;

        const role = (clerkUser.publicMetadata?.role as string) || "USER";

        user = await User.create({
            clerkId,
            name: clerkUser.firstName
                ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
                : clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] || "User",
            email: clerkUser.emailAddresses[0]?.emailAddress || "",
            role,
        });
    }

    return {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        clerkId: user.clerkId,
    };
}
