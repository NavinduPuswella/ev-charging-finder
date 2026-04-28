"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarCheck } from "lucide-react";

interface Booking {
    _id: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    status: string;
    amount: number;
    stationName?: string;
    city?: string;
    stationId?: { name: string; city: string };
    userId: { name: string; email: string };
}

export default function OwnerBookingsPage() {
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

    return (
        <div className="space-y-6 animate-fade-in">
            <div><h1 className="text-2xl font-bold">Bookings</h1><p className="text-muted-foreground">View all bookings for your stations</p></div>
            {bookings.length === 0 ? (
                <Card><CardContent className="p-12 text-center"><CalendarCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-muted-foreground">No bookings yet.</p></CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {bookings.map((b) => (
                        <Card key={b._id}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">{b.userId?.name || "User"} <span className="text-muted-foreground">·</span> {b.stationName || b.stationId?.name || "Station"}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(b.startTime).toLocaleDateString()} · {b.durationHours}h · {new Date(b.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(b.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {b.userId?.email || ""}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Reservation Fee</p>
                                        <p className="font-semibold text-primary">LKR {b.amount}</p>
                                    </div>
                                    <Badge variant={b.status === "CONFIRMED" ? "default" : b.status === "COMPLETED" ? "success" : "destructive"}>{b.status}</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
