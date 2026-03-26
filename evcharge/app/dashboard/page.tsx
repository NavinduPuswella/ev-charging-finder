"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Car,
    CalendarCheck,
    MapPin,
    Route,
    Zap,
    Plus,
    ArrowRight,
    Clock,
    ChevronRight,
    CreditCard,
    Moon,
    Sun,
} from "lucide-react";

interface Vehicle {
    _id: string;
    model: string;
    batteryCapacity: number;
    rangeKm: number;
    chargingType: string;
}

interface Booking {
    _id: string;
    bookingDate?: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    status: string;
    paymentStatus: string;
    amount: number;
    stationName?: string;
    city?: string;
    stationId?: { name: string; city: string; pricePerKwh: number } | string | null;
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

const statusConfig: Record<string, { variant: "default" | "destructive" | "secondary" }> = {
    CONFIRMED: { variant: "default" },
    COMPLETED: { variant: "secondary" },
    CANCELLED: { variant: "destructive" },
    PENDING: { variant: "secondary" },
};

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [themeReady, setThemeReady] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vRes, bRes] = await Promise.all([
                    fetch("/api/vehicles"),
                    fetch("/api/bookings"),
                ]);
                const vData = await vRes.json();
                const bData = await bRes.json();
                setVehicles(vData.vehicles || []);
                setBookings(bData.bookings || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        const stored = localStorage.getItem("theme");
        const initialTheme: "light" | "dark" = stored === "dark" ? "dark" : "light";
        root.classList.toggle("dark", initialTheme === "dark");
        setTheme(initialTheme);
        setThemeReady(true);
    }, []);

    const stats = useMemo(() => {
        const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
        const completed = bookings.filter((b) => b.status === "COMPLETED").length;
        const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
        const totalSpent = bookings
            .filter((b) => b.status !== "CANCELLED")
            .reduce((sum, b) => sum + b.amount, 0);
        return { confirmed, completed, cancelled, totalSpent };
    }, [bookings]);

    const handleCancelBooking = async (id: string) => {
        try {
            await fetch(`/api/bookings/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "CANCELLED" }),
            });
            setBookings((prev) =>
                prev.map((b) =>
                    b._id === id ? { ...b, status: "CANCELLED", paymentStatus: "REFUNDED" } : b
                )
            );
        } catch (err) {
            console.error(err);
        }
    };

    const toggleTheme = () => {
        const nextTheme: "light" | "dark" = theme === "light" ? "dark" : "light";
        const root = document.documentElement;
        root.classList.toggle("dark", nextTheme === "dark");
        localStorage.setItem("theme", nextTheme);
        setTheme(nextTheme);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="h-12 w-12 rounded-full border-[3px] border-primary/20" />
                        <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-[3px] border-transparent border-t-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground animate-pulse">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    const firstName = user?.name?.split(" ")[0] || "there";
    const recentBookings = bookings.slice(0, 4);

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto">
            {/* Hero Greeting */}
            <div className="rounded-2xl border bg-card p-8 animate-fade-in">
                <div>
                    <div className="flex items-start justify-between gap-4">
                        <span className="text-sm font-medium text-muted-foreground">{getGreeting()}</span>
                        {themeReady && (
                            <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2">
                                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                {theme === "dark" ? "Light" : "Dark"}
                            </Button>
                        )}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mt-1">{firstName}</h1>
                    <p className="mt-2 text-muted-foreground max-w-md">
                        {bookings.length === 0
                            ? "Welcome to your EV charging hub. Start by finding a station near you."
                            : `You have ${stats.confirmed} active booking${stats.confirmed !== 1 ? "s" : ""}. Here's your charging overview.`}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link href="/stations">
                            <Button size="sm">
                                <MapPin className="h-4 w-4" />
                                Find Stations
                            </Button>
                        </Link>
                        <Link href="/trip-planner">
                            <Button size="sm" variant="outline">
                                <Route className="h-4 w-4" />
                                Plan a Trip
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <StatCard
                    icon={Car}
                    label="Vehicles"
                    value={vehicles.length}
                    sub={vehicles.length === 1 ? "registered EV" : "registered EVs"}
                />
                <StatCard
                    icon={CalendarCheck}
                    label="Total Bookings"
                    value={bookings.length}
                    sub="all time"
                />
                <StatCard
                    icon={Zap}
                    label="Active"
                    value={stats.confirmed}
                    sub="confirmed sessions"
                />
                <StatCard
                    icon={CreditCard}
                    label="Total Spent"
                    value={`LKR ${stats.totalSpent.toLocaleString()}`}
                    sub={`across ${bookings.length - stats.cancelled} sessions`}
                    isText
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                {/* Recent Bookings */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Recent Activity</h2>
                        {bookings.length > 0 && (
                            <Link href="/dashboard/bookings">
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                                    View All <ChevronRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                    </div>

                    {recentBookings.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                    <CalendarCheck className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                                <p className="font-medium text-muted-foreground mb-1">No bookings yet</p>
                                <p className="text-sm text-muted-foreground/70 mb-5">Find a station to make your first booking</p>
                                <Link href="/stations">
                                    <Button size="sm">
                                        <MapPin className="h-4 w-4" /> Browse Stations
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {recentBookings.map((booking, idx) => (
                                <BookingRow
                                    key={booking._id}
                                    booking={booking}
                                    onCancel={handleCancelBooking}
                                    style={{ animationDelay: `${0.05 * idx}s` }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
                        <div className="grid gap-2">
                            <QuickAction
                                href="/stations"
                                icon={MapPin}
                                label="Find Stations"
                                desc="Nearby chargers"
                            />
                            <QuickAction
                                href="/trip-planner"
                                icon={Route}
                                label="Plan Trip"
                                desc="AI-powered stops"
                            />
                            <QuickAction
                                href="/dashboard/vehicles"
                                icon={Plus}
                                label="Add Vehicle"
                                desc="Register your EV"
                            />
                            <QuickAction
                                href="/dashboard/bookings"
                                icon={CalendarCheck}
                                label="All Bookings"
                                desc="Booking history"
                            />
                        </div>
                    </div>

                    {/* Vehicles */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">My Vehicles</h3>
                            <Link href="/dashboard/vehicles">
                                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
                                    Manage
                                </Button>
                            </Link>
                        </div>
                        {vehicles.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center py-8">
                                    <Car className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                    <p className="text-sm text-muted-foreground mb-3">No vehicles yet</p>
                                    <Link href="/dashboard/vehicles">
                                        <Button size="sm" variant="outline">
                                            <Plus className="h-3.5 w-3.5" /> Add Vehicle
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {vehicles.map((v) => (
                                    <VehicleCard key={v._id} vehicle={v} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Booking Summary Bar */}
            {bookings.length > 0 && (
                <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
                    <Card className="bg-muted/40 border-none">
                        <CardContent className="p-5">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm font-medium">Booking Summary</span>
                                </div>
                                <div className="flex flex-wrap gap-6 text-sm">
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-foreground/40" />
                                        {stats.confirmed} Confirmed
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-foreground/40" />
                                        {stats.completed} Completed
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-foreground/40" />
                                        {stats.cancelled} Cancelled
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

/* ─── Sub Components ─── */

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    isText,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub: string;
    isText?: boolean;
}) {
    return (
        <Card className="group transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                        <p className={`${isText ? "text-xl" : "text-3xl"} font-bold tracking-tight`}>{value}</p>
                        <p className="text-xs text-muted-foreground/70">{sub}</p>
                    </div>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
            </CardContent>
        </Card>
    );
}

function BookingRow({
    booking,
    onCancel,
    style,
}: {
    booking: Booking;
    onCancel: (id: string) => void;
    style?: React.CSSProperties;
}) {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    const canCancel = booking.status === "CONFIRMED" && start.getTime() > Date.now();
    const cfg = statusConfig[booking.status] || statusConfig.PENDING;
    const stationObj = booking.stationId && typeof booking.stationId === "object" ? booking.stationId : null;
    const stationName = booking.stationName || stationObj?.name || "Station";
    const city = booking.city || stationObj?.city || "";

    return (
        <Card className="animate-fade-in transition-all duration-200 hover:shadow-sm" style={style}>
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm truncate">{stationName}</p>
                            <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">
                                {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {city && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {city}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <CalendarCheck className="h-3 w-3" /> {start.toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold">LKR {booking.amount.toLocaleString()}</span>
                        {canCancel && (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => onCancel(booking._id)}
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function QuickAction({
    href,
    icon: Icon,
    label,
    desc,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    desc: string;
}) {
    return (
        <Link href={href}>
            <Card className="group cursor-pointer transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5">
                <CardContent className="flex items-center gap-3 p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30 transition-transform group-hover:scale-110">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1" />
                </CardContent>
            </Card>
        </Link>
    );
}

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
    const batteryPercent = Math.min(100, Math.round((vehicle.rangeKm / 500) * 100));

    return (
        <Card className="transition-all duration-200 hover:shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/30">
                        <Car className="h-4.5 w-4.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{vehicle.model}</p>
                        <p className="text-xs text-muted-foreground">{vehicle.chargingType}</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{vehicle.batteryCapacity} kWh</span>
                        <span className="font-medium">{vehicle.rangeKm} km range</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full rounded-full bg-foreground/60 transition-all duration-700"
                            style={{ width: `${batteryPercent}%` }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
