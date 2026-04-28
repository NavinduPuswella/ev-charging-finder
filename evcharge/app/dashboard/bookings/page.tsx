"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookingCard from "@/components/booking-card";
import { CalendarCheck, MapPin, Route } from "lucide-react";
import { toast } from "sonner";

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
    chargerType?: string;
    pricePerKwh?: number;
    stationId?:
        | { _id?: string; name: string; city: string; pricePerKwh: number }
        | string
        | null;
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
            toast.error(data.error || "Unable to cancel booking");
            return;
        }

        setBookings((prev) =>
            prev.map((b) => (b._id === id ? { ...b, status: "CANCELLED" } : b))
        );
        toast.success("Booking cancelled. No refund will be issued.");
    };

    const { upcoming, completed, cancelled } = useMemo(() => {
        const now = Date.now();
        return {
            upcoming: bookings.filter(
                (b) =>
                    b.status === "CONFIRMED" &&
                    new Date(b.startTime).getTime() > now
            ),
            completed: bookings.filter((b) => b.status === "COMPLETED"),
            cancelled: bookings.filter((b) => b.status === "CANCELLED"),
        };
    }, [bookings]);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    const emptyByTab: Record<
        string,
        { title: string; description: string; primary: { label: string; href: string }; secondary?: { label: string; href: string } }
    > = {
        all: {
            title: "No bookings yet",
            description:
                "Find a station and reserve your first charging session to see it here.",
            primary: { label: "Find Stations", href: "/stations" },
            secondary: { label: "Plan a Trip", href: "/trip-planner" },
        },
        upcoming: {
            title: "No upcoming bookings",
            description: "Reserve a charging slot to see your next session here.",
            primary: { label: "Find Stations", href: "/stations" },
        },
        completed: {
            title: "No completed sessions",
            description: "Your finished charging sessions will appear here.",
            primary: { label: "Find Stations", href: "/stations" },
        },
        cancelled: {
            title: "No cancelled bookings",
            description: "Great news — nothing cancelled on your end.",
            primary: { label: "Find Stations", href: "/stations" },
        },
    };

    const renderBookings = (filtered: Booking[], tab: string) =>
        filtered.length === 0 ? (
            <EmptyBookings
                title={emptyByTab[tab].title}
                description={emptyByTab[tab].description}
                primary={emptyByTab[tab].primary}
                secondary={emptyByTab[tab].secondary}
            />
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((b) => (
                    <BookingCard key={b._id} booking={b} onCancel={handleCancel} />
                ))}
            </div>
        );

    return (
        <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Bookings</h1>
                <p className="text-muted-foreground mt-0.5">
                    View and manage your charging bookings
                </p>
            </div>

            <Tabs defaultValue="all" className="space-y-5">
                <TabsList>
                    <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
                    <TabsTrigger value="upcoming">
                        Upcoming ({upcoming.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        Completed ({completed.length})
                    </TabsTrigger>
                    <TabsTrigger value="cancelled">
                        Cancelled ({cancelled.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="all">{renderBookings(bookings, "all")}</TabsContent>
                <TabsContent value="upcoming">
                    {renderBookings(upcoming, "upcoming")}
                </TabsContent>
                <TabsContent value="completed">
                    {renderBookings(completed, "completed")}
                </TabsContent>
                <TabsContent value="cancelled">
                    {renderBookings(cancelled, "cancelled")}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function EmptyBookings({
    title,
    description,
    primary,
    secondary,
}: {
    title: string;
    description: string;
    primary: { label: string; href: string };
    secondary?: { label: string; href: string };
}) {
    return (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                    <CalendarCheck className="h-8 w-8 text-primary" />
                </div>
                <p className="font-semibold text-base mb-1">{title}</p>
                <p className="text-sm text-muted-foreground max-w-sm mb-5">
                    {description}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Link href={primary.href}>
                        <Button size="sm">
                            <MapPin className="h-4 w-4" /> {primary.label}
                        </Button>
                    </Link>
                    {secondary && (
                        <Link href={secondary.href}>
                            <Button size="sm" variant="outline">
                                <Route className="h-4 w-4" /> {secondary.label}
                            </Button>
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
