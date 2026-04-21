"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
    Building2,
    CalendarCheck,
    Users,
    DollarSign,
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    ListChecks,
    Star,
    Activity,
    AlertTriangle,
    UserPlus,
    MessageSquare,
    PlusCircle,
    PowerOff,
    ChevronRight,
    TrendingUp,
} from "lucide-react";

type RangeKey = "today" | "week" | "month" | "year";

interface TrendPoint {
    label: string;
    bookings: number;
    revenue: number;
}

interface MostBookedStation {
    _id: string;
    name: string;
    city: string;
    status: "AVAILABLE" | "LIMITED" | "MAINTENANCE" | "INACTIVE";
    rating: number;
    bookings: number;
}

interface ActivityItem {
    type:
        | "station_added"
        | "booking_created"
        | "booking_cancelled"
        | "review_submitted"
        | "user_registered"
        | "station_disabled";
    title: string;
    subtitle: string;
    timestamp: string;
}

interface Analytics {
    range: RangeKey;
    totalUsers: number;
    totalStations: number;
    inactiveStations: number;
    maintenanceStations: number;
    totalBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    bookingsTrend: TrendPoint[];
    mostBooked: MostBookedStation[];
    recentActivity: ActivityItem[];
    pendingActions: {
        flaggedReviews: number;
        disabledStations: number;
        bookingsNeedingReview: number;
    };
}

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "year", label: "This Year" },
];

function formatRelative(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    return new Date(iso).toLocaleDateString();
}

function statusBadge(status: MostBookedStation["status"]) {
    switch (status) {
        case "AVAILABLE":
            return { label: "Available", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" };
        case "LIMITED":
            return { label: "Limited", cls: "bg-amber-50 text-amber-700 border-amber-100" };
        case "MAINTENANCE":
            return { label: "Maintenance", cls: "bg-orange-50 text-orange-700 border-orange-100" };
        default:
            return { label: "Inactive", cls: "bg-gray-100 text-gray-600 border-gray-200" };
    }
}

function activityIcon(type: ActivityItem["type"]) {
    switch (type) {
        case "station_added":
            return { Icon: PlusCircle, cls: "text-emerald-600 bg-emerald-50" };
        case "booking_created":
            return { Icon: CalendarCheck, cls: "text-blue-600 bg-blue-50" };
        case "booking_cancelled":
            return { Icon: XCircle, cls: "text-rose-600 bg-rose-50" };
        case "review_submitted":
            return { Icon: MessageSquare, cls: "text-violet-600 bg-violet-50" };
        case "user_registered":
            return { Icon: UserPlus, cls: "text-sky-600 bg-sky-50" };
        case "station_disabled":
            return { Icon: PowerOff, cls: "text-gray-600 bg-gray-100" };
    }
}

export default function AdminOverview() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<RangeKey>("month");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch(`/api/admin/analytics?range=${range}`)
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) setAnalytics(data.analytics);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [range]);

    const rangeSubtitle = useMemo(() => {
        switch (range) {
            case "today":
                return "Showing today's performance";
            case "week":
                return "Showing the last 7 days";
            case "year":
                return "Showing this year so far";
            default:
                return "Showing the last 30 days";
        }
    }, [range]);

    if (loading && !analytics) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <p className="text-muted-foreground">Failed to load analytics.</p>
            </div>
        );
    }

    const kpis = [
        {
            label: "Total Stations",
            value: analytics.totalStations.toLocaleString(),
            icon: Building2,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
            sub: "Active charging stations",
        },
        {
            label: "Total Bookings",
            value: analytics.totalBookings.toLocaleString(),
            icon: CalendarCheck,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            sub: `${analytics.confirmedBookings} confirmed`,
        },
        {
            label: "Total Users",
            value: analytics.totalUsers.toLocaleString(),
            icon: Users,
            color: "text-violet-600",
            bgColor: "bg-violet-50",
            sub: "All registered accounts",
        },
        {
            label: "Total Revenue",
            value: `LKR ${analytics.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: "text-rose-600",
            bgColor: "bg-rose-50",
            sub: "Confirmed + completed",
        },
    ];

    const statusCards = [
        {
            label: "Total Bookings",
            value: analytics.totalBookings,
            icon: ListChecks,
            color: "text-gray-900",
            bgColor: "bg-gray-100",
        },
        {
            label: "Pending",
            value: analytics.pendingBookings,
            icon: Clock,
            color: "text-amber-600",
            bgColor: "bg-amber-50",
        },
        {
            label: "Confirmed",
            value: analytics.confirmedBookings,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
        },
        {
            label: "Completed",
            value: analytics.completedBookings,
            icon: CalendarCheck,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
        },
        {
            label: "Cancelled",
            value: analytics.cancelledBookings,
            icon: XCircle,
            color: "text-rose-600",
            bgColor: "bg-rose-50",
        },
    ];

    const pendingActionItems = [
        {
            label: "Flagged low-rating reviews",
            count: analytics.pendingActions.flaggedReviews,
            href: "/admin/reviews",
            accent: "text-rose-700",
        },
        {
            label: "Disabled stations",
            count: analytics.pendingActions.disabledStations,
            href: "/admin/stations",
            accent: "text-gray-700",
        },
        {
            label: "Bookings needing review",
            count: analytics.pendingActions.bookingsNeedingReview,
            href: "/admin/bookings",
            accent: "text-blue-700",
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                    <p className="text-muted-foreground mt-1">{rangeSubtitle}</p>
                </div>
                <RangeFilter value={range} onChange={setRange} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map(({ label, value, icon: Icon, color, bgColor, sub }) => (
                    <Card key={label} className="overflow-hidden">
                        <div className="h-1 bg-primary" />
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 min-w-0">
                                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                                    <p className="text-3xl font-bold tracking-tight truncate">{value}</p>
                                    <p className="text-xs text-muted-foreground pt-1">{sub}</p>
                                </div>
                                <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bgColor} ${color}`}
                                >
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Booking Status
                    </h2>
                </div>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    {statusCards.map(({ label, value, icon: Icon, color, bgColor }) => (
                        <Card key={label}>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground truncate">
                                            {label}
                                        </p>
                                        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                                    </div>
                                    <div
                                        className={`h-10 w-10 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}
                                    >
                                        <Icon className={`h-5 w-5 ${color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard
                    title="Bookings Trend"
                    subtitle={rangeSubtitle}
                    data={analytics.bookingsTrend.map((p) => ({ label: p.label, value: p.bookings }))}
                    variant="bar"
                    accent="emerald"
                    formatValue={(v) => v.toLocaleString()}
                />
                <ChartCard
                    title="Revenue Trend"
                    subtitle={rangeSubtitle}
                    data={analytics.bookingsTrend.map((p) => ({ label: p.label, value: p.revenue }))}
                    variant="line"
                    accent="emerald"
                    formatValue={(v) => `LKR ${v.toLocaleString()}`}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-lg">Most Booked Stations</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Top 5 stations across all time
                                </p>
                            </div>
                            <Link
                                href="/admin/stations"
                                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                            >
                                View all <ChevronRight className="h-4 w-4" />
                            </Link>
                        </div>

                        {analytics.mostBooked.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">
                                No bookings yet.
                            </p>
                        ) : (
                            <div className="divide-y">
                                <div className="hidden md:grid grid-cols-[auto_1.4fr_1fr_auto_auto] gap-4 px-1 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    <span className="w-8" />
                                    <span>Station</span>
                                    <span>City</span>
                                    <span className="text-right">Status</span>
                                    <span className="text-right">Rating</span>
                                </div>
                                {analytics.mostBooked.map((s, index) => {
                                    const badge = statusBadge(s.status);
                                    return (
                                        <div
                                            key={s._id}
                                            className="py-3 grid md:grid-cols-[auto_1.4fr_1fr_auto_auto] grid-cols-[auto_1fr_auto] gap-4 items-center"
                                        >
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                                                {index + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm truncate">{s.name}</p>
                                                <p className="text-xs text-muted-foreground md:hidden truncate">
                                                    {s.city} · {s.bookings} bookings
                                                </p>
                                            </div>
                                            <span className="hidden md:block text-sm text-muted-foreground truncate">
                                                {s.city}
                                            </span>
                                            <span
                                                className={`hidden md:inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${badge.cls}`}
                                            >
                                                {badge.label}
                                            </span>
                                            <div className="flex items-center gap-3 justify-end">
                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                                    {s.rating ? s.rating.toFixed(1) : "—"}
                                                </span>
                                                <span className="text-sm font-semibold text-primary tabular-nums min-w-[2.5rem] text-right">
                                                    {s.bookings}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-lg">Needs Attention</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Pending admin actions
                                </p>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            {pendingActionItems.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 transition-colors group"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {item.label}
                                        </p>
                                        <p className={`text-xs font-semibold mt-0.5 ${item.accent}`}>
                                            {item.count} {item.count === 1 ? "item" : "items"}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-lg">Recent Activity</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Latest events across the platform
                            </p>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <Activity className="h-5 w-5 text-emerald-600" />
                        </div>
                    </div>

                    {analytics.recentActivity.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                            No recent activity.
                        </p>
                    ) : (
                        <ul className="space-y-1">
                            {analytics.recentActivity.map((a, i) => {
                                const { Icon, cls } = activityIcon(a.type);
                                return (
                                    <li
                                        key={i}
                                        className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                                    >
                                        <div
                                            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cls}`}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {a.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {a.subtitle}
                                            </p>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                                            {formatRelative(a.timestamp)}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function RangeFilter({
    value,
    onChange,
}: {
    value: RangeKey;
    onChange: (v: RangeKey) => void;
}) {
    return (
        <div
            role="tablist"
            aria-label="Time range"
            className="inline-flex items-center rounded-xl border border-border bg-white p-1 shadow-sm"
        >
            {RANGE_OPTIONS.map((opt) => {
                const active = opt.key === value;
                return (
                    <button
                        key={opt.key}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(opt.key)}
                        className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            active
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

type ChartVariant = "line" | "bar";

function ChartCard({
    title,
    subtitle,
    data,
    variant,
    formatValue,
}: {
    title: string;
    subtitle: string;
    data: { label: string; value: number }[];
    variant: ChartVariant;
    accent?: string;
    formatValue: (v: number) => string;
}) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const max = Math.max(...data.map((d) => d.value), 1);
    const [hover, setHover] = useState<number | null>(null);

    const width = 600;
    const height = 220;
    const padX = 32;
    const padTop = 20;
    const padBottom = 28;
    const innerW = width - padX * 2;
    const innerH = height - padTop - padBottom;

    const xFor = (i: number) => {
        if (data.length <= 1) return padX + innerW / 2;
        return padX + (innerW * i) / (data.length - 1);
    };
    const yFor = (v: number) => padTop + innerH - (v / max) * innerH;

    const linePath = data
        .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(d.value).toFixed(2)}`)
        .join(" ");
    const areaPath =
        data.length > 0
            ? `${linePath} L ${xFor(data.length - 1).toFixed(2)} ${padTop + innerH} L ${xFor(0).toFixed(
                  2
              )} ${padTop + innerH} Z`
            : "";

    const gridLines = 4;

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-lg">{title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground inline-flex items-center gap-1 justify-end">
                            <TrendingUp className="h-3.5 w-3.5" /> Total
                        </p>
                        <p className="text-lg font-semibold tabular-nums">{formatValue(total)}</p>
                    </div>
                </div>

                <div className="relative">
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="w-full h-[220px]"
                        preserveAspectRatio="none"
                        onMouseLeave={() => setHover(null)}
                    >
                        <defs>
                            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {Array.from({ length: gridLines + 1 }).map((_, i) => {
                            const y = padTop + (innerH * i) / gridLines;
                            return (
                                <line
                                    key={i}
                                    x1={padX}
                                    x2={width - padX}
                                    y1={y}
                                    y2={y}
                                    stroke="#e5e7eb"
                                    strokeDasharray="3 4"
                                    strokeWidth="1"
                                />
                            );
                        })}

                        {variant === "line" && (
                            <>
                                <path d={areaPath} fill={`url(#grad-${title})`} />
                                <path
                                    d={linePath}
                                    fill="none"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                {data.map((d, i) => (
                                    <g key={i}>
                                        <circle
                                            cx={xFor(i)}
                                            cy={yFor(d.value)}
                                            r={hover === i ? 5 : 3}
                                            fill="white"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth="2"
                                        />
                                        <rect
                                            x={xFor(i) - innerW / data.length / 2}
                                            y={padTop}
                                            width={innerW / data.length}
                                            height={innerH}
                                            fill="transparent"
                                            onMouseEnter={() => setHover(i)}
                                        />
                                    </g>
                                ))}
                            </>
                        )}

                        {variant === "bar" && (
                            <>
                                {data.map((d, i) => {
                                    const bw = Math.max(6, innerW / data.length - 8);
                                    const bx = xFor(i) - bw / 2;
                                    const by = yFor(d.value);
                                    const bh = padTop + innerH - by;
                                    return (
                                        <g key={i}>
                                            <rect
                                                x={bx}
                                                y={by}
                                                width={bw}
                                                height={Math.max(bh, 1)}
                                                rx={4}
                                                fill="hsl(var(--primary))"
                                                opacity={hover === null || hover === i ? 1 : 0.55}
                                                onMouseEnter={() => setHover(i)}
                                            />
                                        </g>
                                    );
                                })}
                            </>
                        )}

                        {data.map((d, i) => {
                            const showLabel =
                                data.length <= 8 ||
                                i === 0 ||
                                i === data.length - 1 ||
                                i % Math.ceil(data.length / 6) === 0;
                            if (!showLabel) return null;
                            return (
                                <text
                                    key={`lbl-${i}`}
                                    x={xFor(i)}
                                    y={height - 8}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fill="#6b7280"
                                >
                                    {d.label}
                                </text>
                            );
                        })}
                    </svg>

                    {hover !== null && data[hover] && (
                        <div
                            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full bg-foreground text-background text-xs rounded-md px-2.5 py-1.5 shadow-md whitespace-nowrap"
                            style={{
                                left: `${(xFor(hover) / width) * 100}%`,
                                top: `${(yFor(data[hover].value) / height) * 100}%`,
                            }}
                        >
                            <div className="font-medium">{data[hover].label}</div>
                            <div className="tabular-nums opacity-90">
                                {formatValue(data[hover].value)}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
