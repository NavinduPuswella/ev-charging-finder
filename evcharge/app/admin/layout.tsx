"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useAuthStore } from "@/store/auth-store";
import Sidebar from "@/components/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
        } else if (!isLoading && user && user.role !== "ADMIN") {
            router.replace("/dashboard");
        }
    }, [isLoaded, isSignedIn, isLoading, user, router]);

    if (!isLoaded || !isSignedIn || isLoading || !user || user.role !== "ADMIN") {
        return (
            <div className="mt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)] mt-16">
            <Sidebar role="ADMIN" />
            <div className="flex-1 bg-muted/30"><div className="p-6 lg:p-8">{children}</div></div>
        </div>
    );
}
