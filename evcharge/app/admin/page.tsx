"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, CalendarCheck, Users, DollarSign, Loader2 } from "lucide-react";

interface Analytics {
    totalUsers: number;
    totalStations: number;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    mostBooked: { name: string; city: string; bookings: number }[];
}

interface KPI {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}

export default function AdminOverview() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/analytics")
            .then((res) => res.json())
            .then((data) => setAnalytics(data.analytics))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
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

    const confirmedBookings = analytics.totalBookings - analytics.completedBookings - analytics.cancelledBookings;

    const kpis: KPI[] = [
        {
            label: "Total Stations",
            value: analytics.totalStations,
            icon: Building2,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
        },
        {
            label: "Total Bookings",
            value: analytics.totalBookings,
            icon: CalendarCheck,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
        },
        {
            label: "Total Users",
            value: analytics.totalUsers,
            icon: Users,
            color: "text-violet-600",
            bgColor: "bg-violet-50",
        },
        {
            label: "Total Revenue",
            value: `$${analytics.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: "text-rose-600",
            bgColor: "bg-rose-50",
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                <p className="text-muted-foreground mt-1">
                    EV Charging Network at a Glance
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map(({ label, value, icon: Icon, color, bgColor }) => (
                    <Card
                        key={label}
                        className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300"
                    >
                        <div
                            className="absolute top-0 left-0 right-0 h-1"
                            style={{
                                background: `linear-gradient(90deg, hsl(var(--primary)), ${color.includes("emerald")
                                        ? "#059669"
                                        : color.includes("blue")
                                            ? "#2563eb"
                                            : color.includes("violet")
                                                ? "#7c3aed"
                                                : "#e11d48"
                                    })`,
                            }}
                        />
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                                    <p className="text-3xl font-bold tracking-tight">{value}</p>
                                </div>
                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bgColor} ${color} transition-transform duration-300 group-hover:scale-110`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-0 shadow-md">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Confirmed</p>
                                <p className="text-2xl font-bold text-emerald-600">{confirmedBookings}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <CalendarCheck className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Completed</p>
                                <p className="text-2xl font-bold text-blue-600">{analytics.completedBookings}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <CalendarCheck className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Cancelled</p>
                                <p className="text-2xl font-bold text-red-500">{analytics.cancelledBookings}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                                <CalendarCheck className="h-5 w-5 text-red-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {analytics.mostBooked.length > 0 && (
                <Card className="border-0 shadow-md">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4">Most Booked Stations</h3>
                        <div className="space-y-3">
                            {analytics.mostBooked.map((s, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                                            {index + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-sm">{s.name}</p>
                                            <p className="text-xs text-muted-foreground">{s.city}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold text-primary">{s.bookings}</span>
                                        <p className="text-xs text-muted-foreground">bookings</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
