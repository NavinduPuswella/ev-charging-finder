"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useAuthStore } from "@/store/auth-store";
import Sidebar from "@/components/sidebar";
import { DashboardThemeProvider } from "@/components/dashboard-theme-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
            return;
        }

        if (!isLoading && user) {
            if (user.role === "ADMIN") {
                router.replace("/admin");
            } else if (user.role === "STATION_OWNER") {
                router.replace("/owner");
            }
        }
    }, [isLoaded, isSignedIn, isLoading, user, router]);

    if (!isLoaded || !isSignedIn || isLoading || !user || user.role !== "USER") {
        return (
            <div className="mt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardThemeProvider>
            <div className="mt-16 flex min-h-[calc(100vh-4rem)]">
                <Sidebar role="USER" />
                <div className="flex-1 bg-background">
                    <div className="p-6 lg:p-8">{children}</div>
                </div>
            </div>
        </DashboardThemeProvider>
    );
}
