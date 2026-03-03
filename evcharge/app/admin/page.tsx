"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, CalendarCheck, DollarSign, TrendingUp, Clock, Loader2 } from "lucide-react";

interface Analytics {
    totalUsers: number;
    totalStations: number;
    pendingStations: number;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    mostBooked: Array<{ name: string; city: string; bookings: number }>;
    peakHours: Array<{ hour: number; count: number }>;
    usersByRole: Record<string, number>;
}

export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const f = async () => {
            const res = await fetch("/api/admin/analytics");
            const data = await res.json();
            setAnalytics(data.analytics);
            setLoading(false);
        };
        f();
    }, []);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (!analytics) return <div className="text-center py-20 text-muted-foreground">Failed to load analytics</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">Platform overview and analytics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: "Total Users", value: analytics.totalUsers, icon: Users, color: "text-blue-600 bg-blue-50" },
                    { label: "Active Stations", value: analytics.totalStations, icon: Building2, color: "text-primary bg-primary/10" },
                    { label: "Total Bookings", value: analytics.totalBookings, icon: CalendarCheck, color: "text-orange-600 bg-orange-50" },
                    { label: "Total Revenue", value: `$${analytics.totalRevenue}`, icon: DollarSign, color: "text-green-600 bg-green-50" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{label}</p>
                                    <p className="text-3xl font-bold mt-1">{value}</p>
                                </div>
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Secondary Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending Stations</p><p className="text-2xl font-bold text-yellow-600">{analytics.pendingStations}</p></div><Building2 className="h-6 w-6 text-yellow-500" /></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold text-green-600">{analytics.completedBookings}</p></div><CalendarCheck className="h-6 w-6 text-green-500" /></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Cancelled</p><p className="text-2xl font-bold text-red-600">{analytics.cancelledBookings}</p></div><CalendarCheck className="h-6 w-6 text-red-500" /></div></CardContent></Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Most Booked */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Most Booked Stations</CardTitle></CardHeader>
                    <CardContent>
                        {analytics.mostBooked.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">No data yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {analytics.mostBooked.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">{i + 1}</span>
                                            <div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-muted-foreground">{s.city}</p></div>
                                        </div>
                                        <span className="font-semibold text-primary">{s.bookings} bookings</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Peak Hours */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Peak Booking Hours</CardTitle></CardHeader>
                    <CardContent>
                        {analytics.peakHours.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">No data yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {analytics.peakHours.map((h, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                        <span className="font-medium">{h.hour}:00 - {h.hour + 1}:00</span>
                                        <span className="font-semibold text-primary">{h.count} bookings</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Users by Role */}
            <Card>
                <CardHeader><CardTitle>Users by Role</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        {Object.entries(analytics.usersByRole).map(([role, count]) => (
                            <div key={role} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                                <span className="font-medium capitalize">{role.toLowerCase().replace("_", " ")}</span>
                                <span className="text-2xl font-bold text-primary">{count}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
