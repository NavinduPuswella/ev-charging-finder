"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    SignInButton,
    SignUpButton,
    SignedIn,
    SignedOut,
    UserButton,
    useAuth,
    useUser,
} from "@clerk/nextjs";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import {
    Menu,
    X,
    LayoutDashboard,
    MapPin,
    Route,
    Shield,
    Building2,
    Phone,
} from "lucide-react";

export default function Navbar() {
    const pathname = usePathname();
    const { isLoaded } = useAuth();
    const { user: clerkUser } = useUser();
    const { user, fetchUser } = useAuthStore();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [dashboardTheme, setDashboardTheme] = useState<"light" | "dark">("light");
    const isHome = pathname === "/";
    const isUserDashboardRoute = pathname.startsWith("/dashboard");
    const useDashboardDarkNavbar = isUserDashboardRoute && dashboardTheme === "dark";

    const role = user?.role ?? "USER";

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser, clerkUser?.id]);

    useEffect(() => {
        const syncTheme = () => {
            const nextTheme = localStorage.getItem("dashboard-theme") ?? localStorage.getItem("theme");
            setDashboardTheme(nextTheme === "dark" ? "dark" : "light");
        };

        const onThemeChange = (event: Event) => {
            const customEvent = event as CustomEvent<"light" | "dark">;
            setDashboardTheme(customEvent.detail === "dark" ? "dark" : "light");
        };

        syncTheme();
        window.addEventListener("storage", syncTheme);
        window.addEventListener("dashboard-theme-change", onThemeChange as EventListener);

        return () => {
            window.removeEventListener("storage", syncTheme);
            window.removeEventListener("dashboard-theme-change", onThemeChange as EventListener);
        };
    }, [pathname]);

    const navLinks = [
        { href: "/stations", label: "Find Stations", icon: MapPin },
        { href: "/trip-planner", label: "Trip Planner", icon: Route },
        { href: "/contact", label: "Contact", icon: Phone },
    ];

    const getDashboardLink = () => {
        switch (role) {
            case "ADMIN":
                return "/admin";
            case "STATION_OWNER":
                return "/owner";
            default:
                return "/dashboard";
        }
    };

    const dashboardIcon = role === "ADMIN"
        ? <Shield className="h-4 w-4" />
        : role === "STATION_OWNER"
            ? <Building2 className="h-4 w-4" />
            : <LayoutDashboard className="h-4 w-4" />;
    const isTransparent = isHome && !scrolled && mounted;

    return (
        <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${isTransparent
            ? "bg-transparent"
            : useDashboardDarkNavbar
                ? "bg-[#0B0E11]/90 backdrop-blur-lg border-b border-white/10"
                : "bg-background/80 backdrop-blur-lg border-b border-border"
        }`}>
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-tight">
                        <span className={`transition-colors duration-300 ${isTransparent || useDashboardDarkNavbar ? "text-white" : "text-foreground"}`}>
                            Charge
                        </span>
                        <span className={`transition-colors duration-300 ${isTransparent || useDashboardDarkNavbar ? "text-green-400" : "text-green-600"}`}>
                            X
                        </span>
                    </span>
                </Link>

                <div className="hidden items-center gap-1 md:flex">
                    {navLinks.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${pathname === href
                                ? isTransparent || useDashboardDarkNavbar ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                : isTransparent || useDashboardDarkNavbar ? "text-white/80" : "text-muted-foreground"
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </Link>
                    ))}
                </div>

                <div className="hidden items-center gap-3 md:flex">
                    {(!mounted || !isLoaded) ? (
                        <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
                    ) : (
                        <>
                            <SignedOut>
                                <SignInButton mode="redirect">
                                    <Button variant="ghost" size="sm" className={`rounded-lg px-4 font-medium ${isTransparent || useDashboardDarkNavbar ? "text-white" : "text-muted-foreground"}`}>
                                        Sign In
                                    </Button>
                                </SignInButton>
                                <SignUpButton mode="redirect">
                                    <Button size="sm" className="rounded-lg px-5">
                                        Get Started
                                    </Button>
                                </SignUpButton>
                            </SignedOut>
                            <SignedIn>
                                <Link href={getDashboardLink()}>
                                    <Button variant="ghost" size="sm" className={`gap-2 rounded-lg px-4 ${isTransparent || useDashboardDarkNavbar ? "text-white" : "text-muted-foreground"}`}>
                                        {dashboardIcon}
                                        Dashboard
                                    </Button>
                                </Link>
                                <UserButton
                                    afterSignOutUrl="/"
                                    appearance={{
                                        elements: {
                                            avatarBox: "h-8 w-8",
                                        },
                                    }}
                                />
                            </SignedIn>
                        </>
                    )}
                </div>

                <button
                    className={`md:hidden p-2 rounded-lg transition-colors ${isTransparent || useDashboardDarkNavbar ? "text-white" : "text-muted-foreground"}`}
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {mobileOpen && (
                <div className={`${useDashboardDarkNavbar ? "bg-[#0B0E11] border-white/10" : "bg-background border-border"} border-b p-4 md:hidden`}>
                    <div className="flex flex-col gap-1">
                        {navLinks.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${pathname === href
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground"
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </Link>
                        ))}
                        <SignedIn>
                            <Link
                                href={getDashboardLink()}
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground"
                            >
                                {dashboardIcon}
                                Dashboard
                            </Link>
                            <div className="pt-3 mt-2 border-t border-border">
                                <UserButton
                                    afterSignOutUrl="/"
                                    appearance={{
                                        elements: {
                                            avatarBox: "h-8 w-8",
                                        },
                                    }}
                                />
                            </div>
                        </SignedIn>
                        <SignedOut>
                            <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-border">
                                <SignInButton mode="redirect">
                                    <Button variant="outline" className="w-full">
                                        Sign In
                                    </Button>
                                </SignInButton>
                                <SignUpButton mode="redirect">
                                    <Button className="w-full">Get Started</Button>
                                </SignUpButton>
                            </div>
                        </SignedOut>
                    </div>
                </div>
            )}
        </nav>
    );
}
