"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { useDashboardTheme } from "@/components/dashboard-theme-provider";
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
    CheckCircle2,
    XCircle,
    Sparkles,
    Star,
} from "lucide-react";

interface Vehicle {
    _id: string;
    brand?: string;
    model: string;
    batteryCapacity: number;
    rangeKm: number;
    chargingType: string;
    isPrimary?: boolean;
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
    reservationFeePerHour?: number;
    totalReservationFee?: number;
    stationName?: string;
    city?: string;
    stationId?: { _id?: string; name: string; city: string; pricePerKwh: number } | string | null;
    createdAt?: string;
    updatedAt?: string;
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

const statusBadge: Record<string, { label: string; cls: string }> = {
    CONFIRMED: {
        label: "Confirmed",
        cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
    },
    COMPLETED: {
        label: "Completed",
        cls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
    },
    CANCELLED: {
        label: "Cancelled",
        cls: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
    },
    PENDING_PAYMENT: {
        label: "Pending Payment",
        cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
    },
    PENDING: {
        label: "Pending",
        cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
    },
};

const bookingActivityIcon: Record<string, { Icon: React.ElementType; cls: string }> = {
    COMPLETED: {
        Icon: CheckCircle2,
        cls: "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/10",
    },
    CANCELLED: {
        Icon: XCircle,
        cls: "text-rose-600 bg-rose-100 dark:text-rose-300 dark:bg-rose-500/10",
    },
    CONFIRMED: {
        Icon: CalendarCheck,
        cls: "text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/10",
    },
    PENDING_PAYMENT: {
        Icon: Clock,
        cls: "text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/10",
    },
    PENDING: {
        Icon: Clock,
        cls: "text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/10",
    },
};

export default function DashboardPage() {
    const { user } = useAuthStore();
    const { theme, toggleTheme, themeReady } = useDashboardTheme();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

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

    const stats = useMemo(() => {
        const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
        const completed = bookings.filter((b) => b.status === "COMPLETED").length;
        const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
        const totalSpent = bookings
            .filter((b) => b.status !== "CANCELLED")
            .reduce((sum, b) => sum + (b.totalReservationFee ?? b.amount), 0);
        return { confirmed, completed, cancelled, totalSpent };
    }, [bookings]);

    const upcomingBooking = useMemo(() => {
        const now = Date.now();
        return bookings
            .filter(
                (b) =>
                    b.status === "CONFIRMED" &&
                    new Date(b.startTime).getTime() > now
            )
            .sort(
                (a, b) =>
                    new Date(a.startTime).getTime() -
                    new Date(b.startTime).getTime()
            )[0];
    }, [bookings]);

    const recentActivity = useMemo(() => {
        return [...bookings]
            .sort((a, b) => {
                const at = new Date(a.updatedAt || a.createdAt || a.startTime).getTime();
                const bt = new Date(b.updatedAt || b.createdAt || b.startTime).getTime();
                return bt - at;
            })
            .slice(0, 4);
    }, [bookings]);

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

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto">
            {/* Hero Greeting */}
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/[0.04] p-8 animate-fade-in">
                <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
                <div className="relative">
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
                            : upcomingBooking
                                ? `You have an upcoming session at ${upcomingBooking.stationName || "your station"}. Stay charged.`
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

            {/* Upcoming Booking */}
            <div className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Upcoming Booking</h2>
                    <Link href="/dashboard/bookings">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                            All Bookings <ChevronRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
                {upcomingBooking ? (
                    <UpcomingBookingCard booking={upcomingBooking} />
                ) : (
                    <UpcomingEmpty />
                )}
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
                    label="Reservation Fees Paid"
                    value={`LKR ${stats.totalSpent.toLocaleString()}`}
                    sub={`across ${bookings.length} sessions`}
                    isText
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                {/* Recent Activity */}
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

                    {recentActivity.length === 0 ? (
                        <EmptyState
                            icon={CalendarCheck}
                            title="No activity yet"
                            description="Book a charging session to see it appear here."
                            actionLabel="Browse Stations"
                            actionHref="/stations"
                        />
                    ) : (
                        <div className="space-y-2.5">
                            {recentActivity.map((booking, idx) => (
                                <ActivityRow
                                    key={booking._id}
                                    booking={booking}
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
                                desc="Smart stops"
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
                                <CardContent className="flex flex-col items-center py-8 text-center">
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
                                {vehicles.slice(0, 3).map((v) => (
                                    <VehicleMini key={v._id} vehicle={v} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Booking Summary Bar */}
            {bookings.length > 0 && (
                <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
                    <Card className="border bg-muted/30">
                        <CardContent className="p-5">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">Booking Summary</span>
                                </div>
                                <div className="grid grid-cols-2 sm:flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                    <SummaryPill
                                        dot="bg-foreground/40"
                                        label="Total"
                                        value={bookings.length}
                                    />
                                    <SummaryPill
                                        dot="bg-emerald-500"
                                        label="Completed"
                                        value={stats.completed}
                                    />
                                    <SummaryPill
                                        dot="bg-rose-500"
                                        label="Cancelled"
                                        value={stats.cancelled}
                                    />
                                    <SummaryPill
                                        dot="bg-primary"
                                        label="Reservation fees"
                                        value={`LKR ${stats.totalSpent.toLocaleString()}`}
                                    />
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

function SummaryPill({ dot, label, value }: { dot: string; label: string; value: string | number }) {
    return (
        <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold">{value}</span>
        </span>
    );
}

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
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4.5 w-4.5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function UpcomingBookingCard({ booking }: { booking: Booking }) {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    const stationObj = booking.stationId && typeof booking.stationId === "object" ? booking.stationId : null;
    const stationName = booking.stationName || stationObj?.name || "Station";
    const city = booking.city || stationObj?.city || "";
    const badge = statusBadge[booking.status] ?? statusBadge.PENDING;

    const daysUntil = Math.max(
        0,
        Math.ceil((start.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
    const countdown =
        start.getTime() - Date.now() < 1000 * 60 * 60 * 24
            ? "Starts today"
            : daysUntil === 1
                ? "In 1 day"
                : `In ${daysUntil} days`;

    return (
        <Card className="overflow-hidden border-primary/20 shadow-sm">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
            <CardContent className="p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Zap className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-semibold truncate">{stationName}</p>
                                <span
                                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}
                                >
                                    {badge.label}
                                </span>
                                <span className="rounded-full border bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
                                    {countdown}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {city && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> {city}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <CalendarCheck className="h-3 w-3" />
                                    {start.toLocaleDateString([], {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    {" – "}
                                    {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 lg:justify-end">
                        <div className="text-right">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Reservation Fee</p>
                            <p className="text-lg font-bold">LKR {(booking.totalReservationFee ?? booking.amount).toLocaleString()}</p>
                        </div>
                        <Link href="/dashboard/bookings">
                            <Button size="sm" className="gap-1">
                                View Booking
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function UpcomingEmpty() {
    return (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <CalendarCheck className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-1">
                    <p className="font-semibold">No upcoming bookings</p>
                    <p className="text-sm text-muted-foreground">
                        Reserve a charging slot or plan a trip to get started.
                    </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Link href="/stations">
                        <Button size="sm">
                            <MapPin className="h-4 w-4" /> Find Stations
                        </Button>
                    </Link>
                    <Link href="/trip-planner">
                        <Button size="sm" variant="outline">
                            <Route className="h-4 w-4" /> Plan Trip
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

function ActivityRow({
    booking,
    style,
}: {
    booking: Booking;
    style?: React.CSSProperties;
}) {
    const start = new Date(booking.startTime);
    const stationObj = booking.stationId && typeof booking.stationId === "object" ? booking.stationId : null;
    const stationName = booking.stationName || stationObj?.name || "Station";
    const city = booking.city || stationObj?.city || "";
    const badge = statusBadge[booking.status] ?? statusBadge.PENDING;
    const { Icon, cls: iconTone } = bookingActivityIcon[booking.status] ?? bookingActivityIcon.PENDING;

    return (
        <Card
            className="group animate-fade-in border-border/70 transition-all duration-200 hover:shadow-sm hover:border-border"
            style={style}
        >
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm truncate">{stationName}</p>
                            <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                                {badge.label}
                            </span>
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
                                {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold">LKR {(booking.totalReservationFee ?? booking.amount).toLocaleString()}</span>
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
            <Card className="group cursor-pointer transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 hover:border-primary/30">
                <CardContent className="flex items-center gap-3 p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30 transition-transform group-hover:scale-110 group-hover:border-primary/30 group-hover:bg-primary/5 group-hover:text-primary">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
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

function VehicleMini({ vehicle }: { vehicle: Vehicle }) {
    const batteryPercent = Math.min(100, Math.round((vehicle.rangeKm / 500) * 100));
    const displayName = vehicle.brand ? `${vehicle.brand} ${vehicle.model}` : vehicle.model;

    return (
        <Card className={`transition-all duration-200 hover:shadow-sm ${vehicle.isPrimary ? "border-primary/40 bg-primary/[0.02]" : ""}`}>
            <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/30">
                        <Car className="h-4.5 w-4.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate">{displayName}</p>
                            {vehicle.isPrimary && (
                                <Badge variant="outline" className="h-4 gap-0.5 border-primary/30 bg-primary/10 px-1.5 py-0 text-[9px] text-primary">
                                    <Star className="h-2.5 w-2.5 fill-primary" /> Primary
                                </Badge>
                            )}
                        </div>
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
                            className="h-full rounded-full bg-primary/70 transition-all duration-700"
                            style={{ width: `${batteryPercent}%` }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    actionHref,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
}) {
    return (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
                    <Icon className="h-7 w-7 text-muted-foreground/60" />
                </div>
                <p className="font-semibold mb-1">{title}</p>
                <p className="text-sm text-muted-foreground mb-5 max-w-sm">{description}</p>
                <Link href={actionHref}>
                    <Button size="sm">
                        <MapPin className="h-4 w-4" /> {actionLabel}
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
