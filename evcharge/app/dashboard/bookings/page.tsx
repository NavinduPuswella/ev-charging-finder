"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookingCard from "@/components/booking-card";
import { CalendarCheck } from "lucide-react";

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

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            const res = await fetch("/api/bookings");
            const data = await res.json();
            setBookings(data.bookings || []);
            setLoading(false);
        };
        fetchBookings();
    }, []);

    const handleCancel = async (id: string) => {
        const res = await fetch(`/api/bookings/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CANCELLED" }),
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || "Unable to cancel booking");
            return;
        }

        setBookings((prev) =>
            prev.map((b) => (b._id === id ? { ...b, status: "CANCELLED", paymentStatus: "REFUNDED" } : b))
        );
    };

    if (loading) {
        return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
    }

    const now = Date.now();
    const upcoming = bookings.filter(
        (b) => b.status === "CONFIRMED" && new Date(b.startTime).getTime() > now
    );
    const completed = bookings.filter((b) => b.status === "COMPLETED");
    const cancelled = bookings.filter((b) => b.status === "CANCELLED");

    const renderBookings = (filtered: Booking[]) =>
        filtered.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><CalendarCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-muted-foreground">No bookings found</p></CardContent></Card>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((b) => <BookingCard key={b._id} booking={b} onCancel={handleCancel} />)}
            </div>
        );

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold">My Bookings</h1>
                <p className="text-muted-foreground">View and manage your charging bookings</p>
            </div>

            <Tabs defaultValue="all">
                <TabsList>
                    <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
                    <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="all">{renderBookings(bookings)}</TabsContent>
                <TabsContent value="upcoming">{renderBookings(upcoming)}</TabsContent>
                <TabsContent value="completed">{renderBookings(completed)}</TabsContent>
                <TabsContent value="cancelled">{renderBookings(cancelled)}</TabsContent>
            </Tabs>
        </div>
    );
}
