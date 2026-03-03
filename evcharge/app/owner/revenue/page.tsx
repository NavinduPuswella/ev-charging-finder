"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, CalendarCheck, Loader2 } from "lucide-react";

interface Booking {
    _id: string;
    date: string;
    duration: number;
    status: string;
    amount: number;
    stationId: { name: string };
    userId: { name: string };
}

export default function RevenuePage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const f = async () => {
            const res = await fetch("/api/bookings");
            const data = await res.json();
            setBookings(data.bookings || []);
            setLoading(false);
        };
        f();
    }, []);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    const paid = bookings.filter((b) => b.status !== "CANCELLED");
    const total = paid.reduce((s, b) => s + b.amount, 0);
    const completed = bookings.filter((b) => b.status === "COMPLETED");

    return (
        <div className="space-y-6 animate-fade-in">
            <div><h1 className="text-2xl font-bold">Revenue Report</h1><p className="text-muted-foreground">Track your charging station earnings</p></div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-3xl font-bold text-primary">${total}</p></div><DollarSign className="h-8 w-8 text-primary" /></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Completed</p><p className="text-3xl font-bold">{completed.length}</p></div><CalendarCheck className="h-8 w-8 text-green-500" /></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Avg Revenue</p><p className="text-3xl font-bold">${paid.length > 0 ? Math.round(total / paid.length) : 0}</p></div><TrendingUp className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
                {paid.length === 0 ? (
                    <Card><CardContent className="p-8 text-center text-muted-foreground">No transactions yet.</CardContent></Card>
                ) : (
                    <div className="space-y-2">
                        {paid.map((b) => (
                            <Card key={b._id}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{b.stationId?.name || "Station"}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(b.date).toLocaleDateString()} · {b.duration}h · {b.userId?.name || "Customer"}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-primary">${b.amount}</span>
                                        <Badge variant={b.status === "COMPLETED" ? "success" : "default"}>{b.status}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
