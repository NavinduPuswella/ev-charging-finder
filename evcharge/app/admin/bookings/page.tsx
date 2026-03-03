"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCheck, Loader2 } from "lucide-react";

interface Booking {
    _id: string;
    date: string;
    duration: number;
    status: string;
    paymentStatus: string;
    amount: number;
    userId: { name: string; email: string };
    stationId: { name: string; city: string };
}

export default function AdminBookingsPage() {
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
            <div>
                <h1 className="text-2xl font-bold">All Bookings</h1>
                <p className="text-muted-foreground">View all bookings across the platform ({bookings.length} total)</p>
            </div>

            {bookings.length === 0 ? (
                <Card><CardContent className="p-12 text-center"><CalendarCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-muted-foreground">No bookings found.</p></CardContent></Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Station</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Payment</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bookings.map((b) => (
                                <TableRow key={b._id}>
                                    <TableCell className="font-medium">{b.userId?.name || "User"}</TableCell>
                                    <TableCell>{b.stationId?.name || "Station"}</TableCell>
                                    <TableCell>{new Date(b.date).toLocaleDateString()}</TableCell>
                                    <TableCell>{b.duration}h</TableCell>
                                    <TableCell className="font-semibold">${b.amount}</TableCell>
                                    <TableCell><Badge variant={b.status === "CONFIRMED" ? "default" : b.status === "COMPLETED" ? "success" : "destructive"}>{b.status}</Badge></TableCell>
                                    <TableCell><Badge variant={b.paymentStatus === "PAID" ? "success" : b.paymentStatus === "REFUNDED" ? "warning" : "secondary"}>{b.paymentStatus}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
