"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, CalendarCheck, XCircle, Loader2 } from "lucide-react";

interface Booking {
    _id: string;
    userId?: { name: string; email: string };
    stationId?: { name: string; city: string };
    stationName?: string;
    city?: string;
    bookingDate?: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    chargerType?: string;
    pricePerKwh?: number;
    status: "CONFIRMED" | "CANCELLED" | "COMPLETED";
    amount: number;
    createdAt: string;
}

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetch("/api/bookings")
            .then((res) => res.json())
            .then((data) => setBookings(data.bookings || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(
        () =>
            bookings.filter(
                (b) =>
                    (b.stationId?.name || "").toLowerCase().includes(search.toLowerCase()) ||
                    (b.stationName || "").toLowerCase().includes(search.toLowerCase()) ||
                    (b.userId?.name || "").toLowerCase().includes(search.toLowerCase()) ||
                    (b.city || b.stationId?.city || "").toLowerCase().includes(search.toLowerCase())
            ),
        [bookings, search]
    );

    const cancelBooking = async (id: string) => {
        const res = await fetch(`/api/bookings/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CANCELLED" }),
        });
        if (res.ok) {
            setBookings((prev) =>
                prev.map((b) => (b._id === id ? { ...b, status: "CANCELLED" } : b))
            );
        }
    };

    const statusColor = (status: string) => {
        switch (status) {
            case "CONFIRMED": return "success";
            case "COMPLETED": return "default";
            case "CANCELLED": return "destructive";
            default: return "secondary";
        }
    };

    const statusLabel = (status: string) =>
        status.charAt(0) + status.slice(1).toLowerCase();

    const counts = {
        total: bookings.length,
        confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
        completed: bookings.filter((b) => b.status === "COMPLETED").length,
        cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
                    <p className="text-muted-foreground">All EV charging bookings</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-sm px-3 py-1">{counts.total} Total</Badge>
                    <Badge variant="success" className="text-sm px-3 py-1">{counts.confirmed} Confirmed</Badge>
                    <Badge className="text-sm px-3 py-1 bg-blue-100 text-blue-800 border-transparent">{counts.completed} Completed</Badge>
                    <Badge variant="destructive" className="text-sm px-3 py-1">{counts.cancelled} Cancelled</Badge>
                </div>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by station or user name…"
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {filtered.length === 0 ? (
                <Card className="border-0 shadow-md">
                    <CardContent className="p-12 text-center">
                        <CalendarCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">No bookings found.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-0 shadow-md overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead>Booking ID</TableHead>
                                <TableHead>Station</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>Booking Date</TableHead>
                                <TableHead>Start</TableHead>
                                <TableHead>End</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Charger Type</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((b) => (
                                <TableRow key={b._id}>
                                    <TableCell className="font-mono text-xs">{b._id.slice(-8)}</TableCell>
                                    <TableCell className="font-medium">{b.stationName || b.stationId?.name || "—"}</TableCell>
                                    <TableCell>{b.userId?.name || "—"}</TableCell>
                                    <TableCell>{b.city || b.stationId?.city || "—"}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{b.bookingDate || new Date(b.startTime).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{new Date(b.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{new Date(b.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
                                    <TableCell>{b.durationHours}h</TableCell>
                                    <TableCell>{b.chargerType || "—"}</TableCell>
                                    <TableCell className="font-medium">LKR {b.amount}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusColor(b.status) as "default" | "success" | "destructive" | "secondary"}>
                                            {statusLabel(b.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        {b.status === "CONFIRMED" ? (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="gap-1"
                                                onClick={() => cancelBooking(b._id)}
                                            >
                                                <XCircle className="h-3.5 w-3.5" /> Cancel
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
