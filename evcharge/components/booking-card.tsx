"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Clock, MapPin, X } from "lucide-react";

interface BookingCardProps {
    booking: {
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
        stationId?: {
            name: string;
            city: string;
            pricePerKwh: number;
        } | string | null;
    };
    onCancel?: (id: string) => void;
}

const statusColors: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
    CONFIRMED: "success",
    COMPLETED: "success",
    CANCELLED: "destructive",
};

export default function BookingCard({ booking, onCancel }: BookingCardProps) {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    const canCancel =
        booking.status === "CONFIRMED" && start.getTime() > Date.now() && !!onCancel;
    const stationObj = booking.stationId && typeof booking.stationId === "object" ? booking.stationId : null;
    const stationName = booking.stationName || stationObj?.name || "Station";
    const city = booking.city || stationObj?.city || "Unknown";
    const statusLabel =
        booking.status.charAt(0) + booking.status.slice(1).toLowerCase();

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{stationName}</CardTitle>
                    <Badge variant={statusColors[booking.status] || "secondary"}>
                        {statusLabel}
                    </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {city}
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                        <CalendarCheck className="h-4 w-4 text-primary" />
                        <span>{start.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{booking.durationHours}h</span>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                    {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" - "}
                    {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-lg font-bold text-primary">LKR {booking.amount}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                            ({booking.status === "CANCELLED" ? "No Refund" : booking.paymentStatus})
                        </span>
                    </div>
                    {canCancel && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onCancel(booking._id)}
                            className="gap-1"
                        >
                            <X className="h-3 w-3" />
                            Cancel
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
