"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    CalendarCheck,
    Clock,
    MapPin,
    X,
    Eye,
    Star,
    Zap,
    CheckCircle2,
    XCircle,
    Info,
} from "lucide-react";
import { toast } from "sonner";

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
        chargerType?: string;
        pricePerKwh?: number;
        stationId?:
            | {
                _id?: string;
                name: string;
                city: string;
                pricePerKwh: number;
            }
            | string
            | null;
    };
    onCancel?: (id: string) => void;
}

const statusStyles: Record<string, string> = {
    CONFIRMED:
        "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
    COMPLETED:
        "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
    CANCELLED:
        "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
    PENDING_PAYMENT:
        "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
};

export default function BookingCard({ booking, onCancel }: BookingCardProps) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);

    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    const now = Date.now();

    const isUpcoming =
        booking.status === "CONFIRMED" && start.getTime() > now;
    const canCancel = isUpcoming && !!onCancel;
    const canReview = booking.status === "COMPLETED";

    const stationObj =
        booking.stationId && typeof booking.stationId === "object"
            ? booking.stationId
            : null;
    const stationName = booking.stationName || stationObj?.name || "Station";
    const city = booking.city || stationObj?.city || "Unknown";
    const stationIdStr = stationObj?._id || (typeof booking.stationId === "string" ? booking.stationId : "");

    const statusLabel =
        booking.status === "PENDING_PAYMENT"
            ? "Pending Payment"
            : booking.status.charAt(0) + booking.status.slice(1).toLowerCase();
    const statusClass =
        statusStyles[booking.status] || statusStyles.PENDING_PAYMENT;

    const StatusIcon =
        booking.status === "COMPLETED"
            ? CheckCircle2
            : booking.status === "CANCELLED"
                ? XCircle
                : booking.status === "CONFIRMED"
                    ? Zap
                    : Clock;

    return (
        <>
            <Card className="group transition-all duration-200 hover:shadow-md hover:border-primary/20">
                <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="font-semibold text-base truncate">{stationName}</h3>
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" /> {city}
                            </div>
                        </div>
                        <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass}`}
                        >
                            <StatusIcon className="h-3 w-3" />
                            {statusLabel}
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
                        <div className="flex items-center gap-2">
                            <CalendarCheck className="h-4 w-4 text-primary" />
                            <div>
                                <p className="text-[11px] text-muted-foreground">Date</p>
                                <p className="font-medium">{start.toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <div>
                                <p className="text-[11px] text-muted-foreground">Time</p>
                                <p className="font-medium">
                                    {start.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                    {" - "}
                                    {end.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                        <div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                Amount
                            </p>
                            <p className="text-lg font-bold text-primary">
                                LKR {booking.amount.toLocaleString()}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                {booking.status === "CANCELLED"
                                    ? "No refund"
                                    : booking.paymentStatus.charAt(0) +
                                      booking.paymentStatus.slice(1).toLowerCase()}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">
                                {booking.durationHours}h
                            </span>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => setDetailsOpen(true)}
                        >
                            <Eye className="h-3.5 w-3.5" /> View Details
                        </Button>
                        {canCancel && (
                            <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1"
                                onClick={() => setCancelOpen(true)}
                            >
                                <X className="h-3.5 w-3.5" /> Cancel
                            </Button>
                        )}
                        {canReview && stationIdStr && (
                            <Button
                                size="sm"
                                variant="secondary"
                                className="gap-1"
                                onClick={() => setReviewOpen(true)}
                            >
                                <Star className="h-3.5 w-3.5" /> Leave Review
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <BookingDetailsDialog
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                booking={{
                    stationName,
                    city,
                    start,
                    end,
                    durationHours: booking.durationHours,
                    amount: booking.amount,
                    status: booking.status,
                    statusLabel,
                    paymentStatus: booking.paymentStatus,
                    chargerType: booking.chargerType,
                    pricePerKwh: booking.pricePerKwh ?? stationObj?.pricePerKwh,
                }}
            />

            {canCancel && (
                <CancelConfirmDialog
                    open={cancelOpen}
                    onOpenChange={setCancelOpen}
                    onConfirm={() => {
                        onCancel?.(booking._id);
                        setCancelOpen(false);
                    }}
                />
            )}

            {canReview && stationIdStr && (
                <ReviewDialog
                    open={reviewOpen}
                    onOpenChange={setReviewOpen}
                    stationId={stationIdStr}
                    stationName={stationName}
                />
            )}
        </>
    );
}

/* ─── Details Dialog ─── */

interface DetailsBooking {
    stationName: string;
    city: string;
    start: Date;
    end: Date;
    durationHours: number;
    amount: number;
    status: string;
    statusLabel: string;
    paymentStatus: string;
    chargerType?: string;
    pricePerKwh?: number;
}

function BookingDetailsDialog({
    open,
    onOpenChange,
    booking,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    booking: DetailsBooking;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Booking Details</DialogTitle>
                    <DialogDescription>
                        Everything you need to know about this session.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/20 p-4 space-y-1">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Station
                        </p>
                        <p className="font-semibold">{booking.stationName}</p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" /> {booking.city}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InfoRow
                            label="Date"
                            value={booking.start.toLocaleDateString([], {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                            })}
                        />
                        <InfoRow label="Duration" value={`${booking.durationHours}h`} />
                        <InfoRow
                            label="Start"
                            value={booking.start.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        />
                        <InfoRow
                            label="End"
                            value={booking.end.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        />
                        {booking.chargerType && (
                            <InfoRow label="Charger" value={booking.chargerType} />
                        )}
                        {booking.pricePerKwh !== undefined && (
                            <InfoRow
                                label="Rate"
                                value={`LKR ${booking.pricePerKwh} / kWh`}
                            />
                        )}
                        <InfoRow label="Status" value={booking.statusLabel} />
                        <InfoRow
                            label="Payment"
                            value={
                                booking.status === "CANCELLED"
                                    ? "No refund"
                                    : booking.paymentStatus.charAt(0) +
                                      booking.paymentStatus.slice(1).toLowerCase()
                            }
                        />
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                Total Amount
                            </p>
                            <p className="text-2xl font-bold text-primary">
                                LKR {booking.amount.toLocaleString()}
                            </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Zap className="h-5 w-5" />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
            <p className="mt-0.5 text-sm font-medium truncate">{value}</p>
        </div>
    );
}

/* ─── Cancel Dialog ─── */

function CancelConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Cancel this booking?</DialogTitle>
                    <DialogDescription>
                        This will release your slot. Please note: cancellations are
                        non-refundable.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-start gap-2 rounded-lg border border-amber-200/50 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>No refund will be issued for cancelled bookings.</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Keep Booking
                    </Button>
                    <Button variant="destructive" onClick={onConfirm}>
                        Yes, Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ─── Review Dialog ─── */

function ReviewDialog({
    open,
    onOpenChange,
    stationId,
    stationName,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stationId: string;
    stationName: string;
}) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (rating === 0) {
            toast.error("Please select a rating");
            return;
        }
        if (comment.trim().length < 3) {
            toast.error("Please write a short comment");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/stations/${stationId}/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating, comment: comment.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to submit review");
                return;
            }
            toast.success("Thanks for your review!");
            onOpenChange(false);
            setRating(0);
            setComment("");
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Rate your experience</DialogTitle>
                    <DialogDescription>
                        Share your thoughts about {stationName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label className="mb-2 block">Your rating</Label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((n) => {
                                const active = (hover || rating) >= n;
                                return (
                                    <button
                                        key={n}
                                        type="button"
                                        onMouseEnter={() => setHover(n)}
                                        onMouseLeave={() => setHover(0)}
                                        onClick={() => setRating(n)}
                                        className="p-1 transition-transform hover:scale-110"
                                        aria-label={`Rate ${n} stars`}
                                    >
                                        <Star
                                            className={`h-7 w-7 transition-colors ${
                                                active
                                                    ? "fill-amber-400 text-amber-400"
                                                    : "text-muted-foreground/40"
                                            }`}
                                        />
                                    </button>
                                );
                            })}
                            {rating > 0 && (
                                <span className="ml-2 text-sm text-muted-foreground">
                                    {rating} / 5
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Comment</Label>
                        <Textarea
                            placeholder="How was the station? Charging speed, staff, location..."
                            value={comment}
                            maxLength={500}
                            rows={4}
                            onChange={(e) => setComment(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {comment.length}/500
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={submitting}>
                        {submitting ? "Submitting..." : "Submit Review"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
