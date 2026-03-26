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
    useUser,
} from "@clerk/nextjs";
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
    const { user, isLoaded } = useUser();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [role, setRole] = useState<string>("USER");
    const [scrolled, setScrolled] = useState(false);
    const [mounted, setMounted] = useState(false);
    const isHome = pathname === "/" || pathname === "/contact";

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        if (isLoaded && user) {
            fetch("/api/auth/me")
                .then((res) => res.json())
                .then((data) => {
                    if (data.user?.role) setRole(data.user.role);
                })
                .catch(() => {});
        }
    }, [isLoaded, user]);

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

    const getDashboardIcon = () => {
        switch (role) {
            case "ADMIN":
                return Shield;
            case "STATION_OWNER":
                return Building2;
            default:
                return LayoutDashboard;
        }
    };

    const DashIcon = getDashboardIcon();
    const isTransparent = isHome && !scrolled && mounted;

    return (
        <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${isTransparent
            ? "bg-transparent"
            : "bg-background/80 backdrop-blur-lg border-b border-border"
        }`}>
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2">
                    <span className={`text-xl font-bold tracking-tight transition-colors duration-300 ${isTransparent ? "text-white" : "text-foreground"}`}>
                        EV<span className="text-primary">Charge</span>
                    </span>
                </Link>

                <div className="hidden items-center gap-1 md:flex">
                    {navLinks.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${pathname === href
                                ? isTransparent ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                : isTransparent ? "text-white/80" : "text-muted-foreground"
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
                                    <Button variant="ghost" size="sm" className={`rounded-lg px-4 font-medium ${isTransparent ? "text-white" : "text-muted-foreground"}`}>
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
                                    <Button variant="ghost" size="sm" className={`gap-2 rounded-lg px-4 ${isTransparent ? "text-white" : "text-muted-foreground"}`}>
                                        <DashIcon className="h-4 w-4" />
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
                    className={`md:hidden p-2 rounded-lg transition-colors ${isTransparent ? "text-white" : "text-muted-foreground"}`}
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {mobileOpen && (
                <div className="bg-background border-b border-border p-4 md:hidden">
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
                                <DashIcon className="h-4 w-4" />
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
