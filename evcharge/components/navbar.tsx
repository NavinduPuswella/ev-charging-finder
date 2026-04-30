"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
    SignInButton,
    SignUpButton,
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
    MapPinCheck,
} from "lucide-react";

export default function Navbar() {
    const pathname = usePathname();
    const { isLoaded, isSignedIn } = useAuth();
    const { user: clerkUser } = useUser();
    const { user, fetchUser } = useAuthStore();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isNavVisible, setIsNavVisible] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [dashboardTheme, setDashboardTheme] = useState<"light" | "dark">("light");
    const lastScrollY = useRef(0);
    const isHome = pathname === "/";
    const isDashboardRoute = pathname.startsWith("/dashboard");

    const role = user?.role ?? "USER";

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - lastScrollY.current;

            setScrolled(currentScrollY > 24);

            if (mobileOpen) {
                setIsNavVisible(true);
            } else if (Math.abs(scrollDelta) > 8) {
                const isScrollingDown = scrollDelta > 0;
                const hasLeftTop = currentScrollY > 80;
                setIsNavVisible(!(isScrollingDown && hasLeftTop));
            }

            lastScrollY.current = currentScrollY;
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [mobileOpen]);

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
        { href: "/list-station", label: "List Station", icon: MapPinCheck },
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
    const useDashboardDarkBackdrop = isDashboardRoute && dashboardTheme === "dark";
    const useWhiteNavText = isTransparent || useDashboardDarkBackdrop;
    const navSurfaceClass = isTransparent
        ? "bg-white/10 border border-white/20"
        : useDashboardDarkBackdrop
            ? "bg-[#0B0E11]/70 border border-white/20"
            : "bg-background/55 border border-white/20";
    const mobileSurfaceClass = useDashboardDarkBackdrop
        ? "border-white/20 bg-[#0B0E11]/90"
        : "border-white/20 bg-background/70";

    return (
        <>
            {useDashboardDarkBackdrop && (
                <div className="fixed inset-x-0 top-0 z-40 h-16 bg-[#0B0E11]" aria-hidden="true" />
            )}
            <nav className={`fixed left-1/2 top-3 z-50 w-[calc(100%-1rem)] max-w-7xl -translate-x-1/2 ${isNavVisible ? "translate-y-0 scale-100" : "-translate-y-20 scale-[0.98] pointer-events-none"}`}>
                <div className={`${navSurfaceClass} rounded-full backdrop-blur-2xl`}>
                    <div className="mx-auto flex h-12 items-center justify-between px-4 sm:px-5">
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-xl font-bold tracking-tight">
                                <span className={`transition-colors duration-300 ${useWhiteNavText ? "text-white" : "text-foreground"}`}>
                                    Charge
                                </span>
                                <span className={`transition-colors duration-300 ${useWhiteNavText ? "text-green-400" : "text-green-600"}`}>
                                    X
                                </span>
                            </span>
                        </Link>

                        <div className="hidden items-center gap-1 md:flex">
                            {navLinks.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${pathname === href
                                        ? useWhiteNavText ? "bg-white/20 text-white" : "bg-primary/10 text-primary rounded-full"
                                        : useWhiteNavText ? "text-white" : "text-muted-foreground"
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Link>
                            ))}
                        </div>

                        <div className="hidden items-center gap-3 md:flex">
                            {(!mounted || !isLoaded) ? (
                                <div className="h-8 w-20 animate-pulse bg-muted" />
                            ) : (
                                <>
                                    {!isSignedIn ? (
                                        <>
                                            <SignInButton mode="redirect">
                                                <Button variant="ghost" size="sm" className={`rounded-md px-3 font-medium ${useWhiteNavText ? "text-white" : "text-muted-foreground"}`}>
                                                    Sign In
                                                </Button>
                                            </SignInButton>
                                            <SignUpButton mode="redirect">
                                                <Button size="sm" className="rounded-md px-4">
                                                    Get Started
                                                </Button>
                                            </SignUpButton>
                                        </>
                                    ) : (
                                        <>
                                        <Link href={getDashboardLink()}>
                                            <Button variant="ghost" size="sm" className={`gap-2 rounded-md px-3 ${useWhiteNavText ? "text-white" : "text-muted-foreground"}`}>
                                                {dashboardIcon}
                                                Dashboard
                                            </Button>
                                        </Link>
                                        <UserButton
                                            appearance={{
                                                elements: {
                                                    avatarBox: "h-8 w-8",
                                                },
                                            }}
                                        />
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        <button
                            className={`p-2 transition-colors md:hidden ${useWhiteNavText ? "text-white" : "text-muted-foreground"}`}
                            onClick={() => setMobileOpen(!mobileOpen)}
                        >
                            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    <div className={`rounded-b-md border-x border-b p-3 backdrop-blur-xl md:hidden ${mobileSurfaceClass}`}>
                        <div className="flex flex-col gap-1">
                            {navLinks.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${pathname === href
                                        ? useWhiteNavText ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                        : useWhiteNavText ? "text-white" : "text-muted-foreground"
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Link>
                            ))}
                            {isSignedIn ? (
                                <>
                                <Link
                                    href={getDashboardLink()}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${useWhiteNavText ? "text-white" : "text-muted-foreground"}`}
                                >
                                    {dashboardIcon}
                                    Dashboard
                                </Link>
                                <div className="pt-3 mt-2 border-t border-border">
                                    <UserButton
                                        appearance={{
                                            elements: {
                                                avatarBox: "h-8 w-8",
                                            },
                                        }}
                                    />
                                </div>
                                </>
                            ) : (
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
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
}
