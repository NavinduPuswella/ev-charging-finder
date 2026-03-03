"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookingCard from "@/components/booking-card";
import { CalendarCheck } from "lucide-react";

interface Booking {
    _id: string;
    date: string;
    duration: number;
    status: string;
    paymentStatus: string;
    amount: number;
    stationId: { name: string; city: string; pricePerKwh: number };
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
        await fetch(`/api/bookings/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CANCELLED" }),
        });
        setBookings((prev) =>
            prev.map((b) => (b._id === id ? { ...b, status: "CANCELLED", paymentStatus: "REFUNDED" } : b))
        );
    };

    if (loading) {
        return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
    }

    const filterBookings = (status?: string) =>
        status ? bookings.filter((b) => b.status === status) : bookings;

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
                    <TabsTrigger value="confirmed">Active ({filterBookings("CONFIRMED").length})</TabsTrigger>
                    <TabsTrigger value="completed">Completed ({filterBookings("COMPLETED").length})</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled ({filterBookings("CANCELLED").length})</TabsTrigger>
                </TabsList>
                <TabsContent value="all">{renderBookings(bookings)}</TabsContent>
                <TabsContent value="confirmed">{renderBookings(filterBookings("CONFIRMED"))}</TabsContent>
                <TabsContent value="completed">{renderBookings(filterBookings("COMPLETED"))}</TabsContent>
                <TabsContent value="cancelled">{renderBookings(filterBookings("CANCELLED"))}</TabsContent>
            </Tabs>
        </div>
    );
}
