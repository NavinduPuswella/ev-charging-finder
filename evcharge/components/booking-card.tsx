"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Clock, MapPin, X } from "lucide-react";

interface BookingCardProps {
    booking: {
        _id: string;
        date: string;
        duration: number;
        status: string;
        paymentStatus: string;
        amount: number;
        stationId: {
            name: string;
            city: string;
            pricePerKwh: number;
        };
    };
    onCancel?: (id: string) => void;
}

const statusColors: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
    PENDING: "warning",
    CONFIRMED: "default",
    COMPLETED: "success",
    CANCELLED: "destructive",
};

export default function BookingCard({ booking, onCancel }: BookingCardProps) {
    const date = new Date(booking.date);

    return (
        <Card className="transition-all hover:shadow-md">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{booking.stationId?.name || "Station"}</CardTitle>
                    <Badge variant={statusColors[booking.status] || "secondary"}>
                        {booking.status}
                    </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {booking.stationId?.city || "Unknown"}
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                        <CalendarCheck className="h-4 w-4 text-primary" />
                        <span>{date.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{booking.duration}h</span>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-lg font-bold text-primary">${booking.amount}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                            ({booking.paymentStatus})
                        </span>
                    </div>
                    {booking.status === "CONFIRMED" && onCancel && (
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
