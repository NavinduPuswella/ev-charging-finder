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

    const isTransparent = isHome && !scrolled && mounted;

    return (
        <nav className={`fixed top-0 z-50 w-full transition-all duration-500 ${isTransparent
            ? "bg-transparent"
            : "bg-white/70 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.08)]"
            }`}>
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 transition-all duration-300 group-hover:scale-110 group-hover:shadow-green-500/40">
                        <Zap className="h-5 w-5" />
                    </div>
                    <span className={`text-xl font-bold tracking-tight transition-colors duration-300 ${isTransparent ? "text-white" : "text-gray-900"}`}>
                        EV<span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">Charge</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden items-center gap-1 md:flex">
                    {navLinks.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${pathname === href
                                ? isTransparent ? "bg-white/20 text-white backdrop-blur-sm" : "bg-green-50 text-green-700"
                                : isTransparent ? "text-white/80 hover:bg-white/15 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </Link>
                    ))}
                </div>

                {/* Auth Section */}
                <div className="hidden items-center gap-3 md:flex">
                    {(!mounted || !isLoaded) ? (
                        <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
                    ) : (
                        <>
                            <SignedOut>
                                <SignInButton mode="redirect">
                                    <Button variant="ghost" size="sm" className={`rounded-full px-4 font-medium transition-all duration-200 ${isTransparent ? "text-white hover:bg-white/15 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}>
                                        Sign In
                                    </Button>
                                </SignInButton>
                                <SignUpButton mode="redirect">
                                    <Button size="sm" className="rounded-full px-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md shadow-green-500/25 hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 border-0">Get Started</Button>
                                </SignUpButton>
                            </SignedOut>
                            <SignedIn>
                                <Link href={getDashboardLink()}>
                                    <Button variant="ghost" size="sm" className={`gap-2 rounded-full px-4 transition-all duration-200 ${isTransparent ? "text-white hover:bg-white/15 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}>
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
                    className={`md:hidden p-2 rounded-full transition-all duration-200 ${isTransparent ? "text-white hover:bg-white/15" : "text-gray-600 hover:bg-gray-100"}`}
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="bg-white/95 backdrop-blur-xl p-4 md:hidden shadow-lg">
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
