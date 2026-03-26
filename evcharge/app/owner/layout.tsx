"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useAuthStore } from "@/store/auth-store";
import Sidebar from "@/components/sidebar";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();
    const { user, isLoading, fetchUser } = useAuthStore();

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            fetchUser();
        }
    }, [isLoaded, isSignedIn, fetchUser]);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/sign-in");
        } else if (!isLoading && user && user.role !== "STATION_OWNER") {
            router.push("/");
        }
    }, [isLoaded, isSignedIn, isLoading, user, router]);

    if (!isLoaded || !isSignedIn || isLoading) {
        return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)] mt-16">
            <Sidebar role="STATION_OWNER" />
            <div className="flex-1 bg-muted/30"><div className="p-6 lg:p-8">{children}</div></div>
        </div>
    );
}
