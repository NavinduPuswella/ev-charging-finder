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
    Zap,
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

    useEffect(() => {
        if (isLoaded && user) {
            // Fetch role from our MongoDB via API
            fetch("/api/auth/me")
                .then((res) => res.json())
                .then((data) => {
                    if (data.user?.role) setRole(data.user.role);
                })
                .catch(() => { });
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

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                        <Zap className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold text-foreground">
                        EV<span className="text-primary">Charge</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden items-center gap-1 md:flex">
                    {navLinks.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === href
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </Link>
                    ))}
                </div>

                {/* Auth Section */}
                <div className="hidden items-center gap-3 md:flex">
                    {!isLoaded ? (
                        <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
                    ) : (
                        <>
                            <SignedOut>
                                <SignInButton mode="redirect">
                                    <Button variant="ghost" size="sm">
                                        Sign In
                                    </Button>
                                </SignInButton>
                                <SignUpButton mode="redirect">
                                    <Button size="sm">Get Started</Button>
                                </SignUpButton>
                            </SignedOut>
                            <SignedIn>
                                <Link href={getDashboardLink()}>
                                    <Button variant="ghost" size="sm" className="gap-2">
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

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 rounded-lg hover:bg-accent"
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="border-t border-border bg-white p-4 md:hidden">
                    <div className="flex flex-col gap-2">
                        {navLinks.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === href
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-accent"
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
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                            >
                                <DashIcon className="h-4 w-4" />
                                Dashboard
                            </Link>
                            <div className="pt-2 border-t border-border">
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
                            <div className="flex flex-col gap-2 pt-2 border-t border-border">
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
