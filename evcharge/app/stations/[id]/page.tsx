"use client";

import { useEffect, useMemo, useRef, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MapView from "@/components/map-view";
import { StationDescription } from "@/components/station-description";
import {
    MapPin,
    Star,
    Zap,
    Clock,
    CalendarCheck,
    User,
    Loader2,
    Phone,
    Timer,
    BatteryCharging,
    Info,
    Receipt,
} from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
    REFUND_POLICY_LABEL,
    RESERVATION_HELPER_NOTE,
    formatChargingRate,
    formatReservationFee,
    formatReservationFeePerHour,
    calculateTotalReservationFee,
} from "@/lib/pricing";

interface Station {
    _id: string;
    name: string;
    city: string;
    chargerType: string;
    pricePerKwh: number;
    reservationFeePerHour: number;
    rating: number;
    totalSlots: number;
    totalChargingPoints?: number;
    availableNow?: number;
    occupiedNow?: number;
    availabilityStatus?: "Available" | "Limited Availability" | "Fully Booked" | "Closed";
    status?: "AVAILABLE" | "LIMITED" | "MAINTENANCE" | "INACTIVE";
    location: { latitude: number; longitude: number };
    address?: string;
    description?: string;
    ownerId?: { name: string; email: string };
}

interface Review {
    _id: string;
    rating: number;
    comment: string;
    createdAt: string;
    userId: { name: string };
}

interface AvailabilityResult {
    totalChargingPoints: number;
    availablePoints: number;
    occupiedPoints: number;
    canBook: boolean;
    bookingWindow: {
        startTime: string;
        endTime: string;
    };
}

interface SlotData {
    _id: string;
    startTime: string;
    endTime: string;
    status: "AVAILABLE" | "BOOKED";
}

function toDateInputString(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getTodayDateString() {
    return toDateInputString(new Date());
}

function getMaxBookingDateString() {
    const max = new Date();
    max.setHours(0, 0, 0, 0);
    max.setFullYear(max.getFullYear() + 1);
    return toDateInputString(max);
}

function parseDateInputString(value: string) {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
}

function clampBookingDate(value: string) {
    const parsed = parseDateInputString(value);
    if (!parsed) return getTodayDateString();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const max = new Date(today);
    max.setFullYear(max.getFullYear() + 1);

    if (parsed.getTime() < today.getTime()) return toDateInputString(today);
    if (parsed.getTime() > max.getTime()) return toDateInputString(max);
    return toDateInputString(parsed);
}

function getNextHourTimeString() {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    return now.toTimeString().slice(0, 5);
}

function toLocalDateInputValue(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return toDateInputString(date);
}

function toLocalTimeInputValue(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

function getAvailabilityBadge(status: Station["availabilityStatus"]) {
    if (status === "Available") return "success" as const;
    if (status === "Limited Availability") return "warning" as const;
    if (status === "Closed") return "secondary" as const;
    return "destructive" as const;
}

export default function StationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isSignedIn } = useAuth();
    const { user: clerkUser } = useUser();

    const bookingSectionRef = useRef<HTMLDivElement | null>(null);

    const [station, setStation] = useState<Station | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingDate, setBookingDate] = useState(getTodayDateString());
    const [startTime, setStartTime] = useState(getNextHourTimeString());
    const [durationHours, setDurationHours] = useState("1");
    const [submittingBooking, setSubmittingBooking] = useState(false);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [bookingAvailability, setBookingAvailability] = useState<AvailabilityResult | null>(null);
    const [slots, setSlots] = useState<SlotData[]>([]);
    const [selectedSlotId, setSelectedSlotId] = useState("manual");
    const [reviewComment, setReviewComment] = useState("");
    const [reviewRating, setReviewRating] = useState(5);
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
    const [durationError, setDurationError] = useState<string | null>(null);
    const [dateError, setDateError] = useState<string | null>(null);

    const minBookingDate = useMemo(() => getTodayDateString(), []);
    const maxBookingDate = useMemo(() => getMaxBookingDateString(), []);

    const validateBookingDate = (value: string): string | null => {
        const parsed = parseDateInputString(value);
        if (!parsed) return "Please select a valid booking date.";

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const max = new Date(today);
        max.setFullYear(max.getFullYear() + 1);

        if (parsed.getTime() < today.getTime()) {
            return "Booking date cannot be in the past.";
        }
        if (parsed.getTime() > max.getTime()) {
            return "You can only book up to one year in advance.";
        }
        return null;
    };

    const handleBookingDateChange = (value: string) => {
        setBookingDate(value);
        setDateError(value ? validateBookingDate(value) : "Please select a booking date.");
    };

    const handleBookingDateBlur = () => {
        if (!bookingDate) {
            setBookingDate(getTodayDateString());
            setDateError(null);
            return;
        }
        const clamped = clampBookingDate(bookingDate);
        if (clamped !== bookingDate) {
            setBookingDate(clamped);
        }
        setDateError(validateBookingDate(clamped));
    };

    const refreshStation = async () => {
        const [stationRes, slotsRes] = await Promise.all([
            fetch(`/api/stations/${id}`),
            fetch(`/api/stations/${id}/slots`),
        ]);

        const stationData = await stationRes.json();
        const slotsData = await slotsRes.json();

        setStation(stationData.station);
        setReviews(stationData.reviews || []);
        setSlots(slotsData.slots || []);
        setLoading(false);
    };

    useEffect(() => {
        refreshStation();
        
    }, [id]);

    useEffect(() => {
        if (searchParams.get("book") === "true" && bookingSectionRef.current) {
            setTimeout(() => {
                bookingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 150);
        }
    }, [searchParams]);

    useEffect(() => {
        const parsed = Number(durationHours);
        if (durationHours !== "" && (!Number.isFinite(parsed) || parsed < 1 || parsed > 5)) {
            setDurationError("Maximum booking duration is 5 hours.");
        } else {
            setDurationError(null);
        }
    }, [durationHours]);

    useEffect(() => {
        const run = async () => {
            if (!station) return;

            const parsedDuration = Number(durationHours);
            if (!bookingDate || !startTime || parsedDuration < 1 || parsedDuration > 5) {
                setBookingAvailability(null);
                return;
            }

            if (validateBookingDate(bookingDate)) {
                setBookingAvailability(null);
                return;
            }

            setCheckingAvailability(true);
            try {
                const res = await fetch(`/api/stations/${id}/availability`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        bookingDate,
                        startTime,
                        durationHours: parsedDuration,
                    }),
                });
                const data = await res.json();
                if (res.ok) setBookingAvailability(data);
                else setBookingAvailability(null);
            } finally {
                setCheckingAvailability(false);
            }
        };

        run();
    }, [id, bookingDate, startTime, durationHours, station]);

    useEffect(() => {
        if (selectedSlotId === "manual") return;
        const slot = slots.find((item) => item._id === selectedSlotId);
        if (!slot) return;

        const start = new Date(slot.startTime);
        const end = new Date(slot.endTime);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

        const durationMs = end.getTime() - start.getTime();
        const duration = Math.min(5, Math.max(1, Math.round(durationMs / (1000 * 60 * 60))));

        const slotDate = toLocalDateInputValue(slot.startTime);
        setBookingDate(slotDate);
        setDateError(slotDate ? validateBookingDate(slotDate) : null);
        setStartTime(toLocalTimeInputValue(slot.startTime));
        setDurationHours(String(duration));
    }, [selectedSlotId, slots]);

    const bookingSummary = useMemo(() => {
        if (!bookingDate || !startTime) return null;

        const start = new Date(`${bookingDate}T${startTime}:00`);
        if (Number.isNaN(start.getTime())) return null;

        const hours = Math.min(5, Number(durationHours) || 1);
        const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

        return {
            start,
            end,
            hours,
        };
    }, [bookingDate, startTime, durationHours]);

    const handleBook = async () => {
        if (!isSignedIn) {
            router.push("/sign-in");
            return;
        }

        if (!bookingSummary || !station) return;

        const parsedDuration = Number(durationHours);
        if (!Number.isFinite(parsedDuration) || parsedDuration < 1 || parsedDuration > 5) {
            setDurationError("Maximum booking duration is 5 hours.");
            return;
        }

        const dateValidation = validateBookingDate(bookingDate);
        if (dateValidation) {
            setDateError(dateValidation);
            toast.error(dateValidation);
            return;
        }

        setSubmittingBooking(true);
        setPaymentStatus(null);

        try {
            const bookingRes = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stationId: id,
                    bookingDate,
                    startTime,
                    durationHours: bookingSummary.hours,
                }),
            });

            const bookingData = await bookingRes.json();
            if (!bookingRes.ok) {
                toast.error(bookingData.error || "Booking failed");
                setSubmittingBooking(false);
                return;
            }

            const bookingId = bookingData.paymentDetails.bookingId;
            const amount = bookingData.paymentDetails.amount;
            const currency = "LKR";
            const merchantId = process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID || "";

            const hashRes = await fetch("/api/payhere/hash", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    order_id: bookingId,
                    amount: amount.toFixed(2),
                    currency,
                }),
            });

            const hashData = await hashRes.json();
            if (!hashRes.ok) {
                toast.error("Failed to initialize payment");
                setSubmittingBooking(false);
                return;
            }

            const payhereGlobal = (window as unknown as { payhere: typeof payhere }).payhere;

            payhereGlobal.onCompleted = async function onCompleted() {
                const confirmRes = await fetch(`/api/bookings/${bookingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "CONFIRMED" }),
                });

                if (!confirmRes.ok) {
                    setPaymentStatus("error");
                    setSubmittingBooking(false);
                    toast.error("Payment completed, but booking confirmation failed. Please contact support.");
                    return;
                }

                setPaymentStatus("success");
                setSubmittingBooking(false);
                toast.success("Payment successful. Booking confirmed.");
                refreshStation();
            };

            payhereGlobal.onDismissed = function onDismissed() {
                setPaymentStatus("dismissed");
                setSubmittingBooking(false);
                toast.message("Payment cancelled.");
                fetch(`/api/bookings/${bookingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "CANCELLED" }),
                });
            };

            payhereGlobal.onError = function onError() {
                setPaymentStatus("error");
                setSubmittingBooking(false);
                toast.error("Payment failed. Please try again.");
            };

            const payment = {
                sandbox: true,
                merchant_id: merchantId,
                return_url: `${window.location.origin}/dashboard/bookings`,
                cancel_url: window.location.href,
                notify_url: `${window.location.origin}/api/payhere/notify`,
                order_id: bookingId,
                items: `EV Charging - ${station.name}`,
                amount: amount.toFixed(2),
                currency: currency,
                hash: hashData.hash,
                first_name: clerkUser?.firstName || "Customer",
                last_name: clerkUser?.lastName || "",
                email: clerkUser?.emailAddresses?.[0]?.emailAddress || "customer@example.com",
                phone: "0771234567",
                address: station.address || station.city,
                city: station.city || "Colombo",
                country: "Sri Lanka",
            };

            payhereGlobal.startPayment(payment);
        } catch {
            toast.error("Something went wrong. Please try again.");
            setSubmittingBooking(false);
        }
    };

    const handleReview = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/api/stations/${id}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
        });

        const data = await res.json();
        if (res.ok) {
            setReviews((prev) => [data.review, ...prev]);
            setReviewComment("");
            toast.success("Review submitted.");
        } else {
            toast.error(data.error || "Failed to submit review");
        }
    };

    if (loading) {
        return (
            <div className="mt-16 flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!station) {
        return <div className="mt-16 flex justify-center py-20 text-muted-foreground">Station not found</div>;
    }

    const totalChargingPoints = station.totalChargingPoints || station.totalSlots;
    const availableNow = station.availableNow ?? 0;
    const occupiedNow = station.occupiedNow ?? 0;
    const isClosed =
        station.status === "INACTIVE" ||
        station.status === "MAINTENANCE" ||
        station.availabilityStatus === "Closed";
    const availableSlots = slots
        .filter((slot) => slot.status === "AVAILABLE")
        .filter((slot) => new Date(slot.endTime).getTime() > Date.now())
        .sort(
            (a, b) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
            <section className="border-b bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-10 pt-24 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
                    <div>
                        <Badge variant="outline" className="mb-4">
                            <BatteryCharging className="mr-1 h-3.5 w-3.5" />
                            Station Details
                        </Badge>
                        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">{station.name}</h1>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5 rounded-full border bg-slate-50 px-3 py-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {station.city}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border bg-slate-50 px-3 py-1">
                                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                                {station.rating.toFixed(1)}
                            </span>
                            {station.chargerType.split(",").map((t) => t.trim()).filter(Boolean).map((type) => (
                                <Badge key={type} variant="secondary">
                                    <Zap className="mr-1 h-3 w-3" />
                                    {type}
                                </Badge>
                            ))}
                            <Badge variant={getAvailabilityBadge(station.availabilityStatus)}>
                                {station.availabilityStatus}
                            </Badge>
                        </div>
                    </div>
                    <div className="grid w-full max-w-md grid-cols-3 gap-3">
                        <HeaderMetric label="Total Points" value={`${totalChargingPoints}`} />
                        <HeaderMetric label="Available" value={`${availableNow}`} />
                        <HeaderMetric label="Occupied" value={`${occupiedNow}`} />
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card className="border bg-white">
                            <CardContent className="p-5">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <p className="text-base font-semibold">Charging summary</p>
                                    <Button
                                        className="gap-2"
                                        disabled={availableNow <= 0 || isClosed}
                                        onClick={() => bookingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                                    >
                                        <CalendarCheck className="h-4 w-4" />
                                        {isClosed ? "Closed" : availableNow > 0 ? "Book Slot" : "Fully Booked"}
                                    </Button>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <StatTile icon={<Zap className="h-4 w-4 text-primary" />} label="Total Points" value={`${totalChargingPoints}`} />
                                    <StatTile icon={<Clock className="h-4 w-4 text-emerald-600" />} label="Available" value={`${availableNow}`} />
                                    <StatTile icon={<Timer className="h-4 w-4 text-amber-600" />} label="Occupied" value={`${occupiedNow}`} />
                                </div>
                            </CardContent>
                        </Card>

                        <div ref={bookingSectionRef} id="booking-section">
                            <Card className="border bg-white">
                                <CardContent className="space-y-5 p-5">
                                    <div>
                                        <p className="text-lg font-semibold">Book a charging slot</p>
                                        <p className="text-sm text-muted-foreground">
                                            {isClosed
                                                ? "This station is currently closed by admin."
                                                : "Choose an available slot or set date and time manually."}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Predefined Slot (optional)</Label>
                                        <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an available slot" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="manual">Manual Date & Time</SelectItem>
                                                {availableSlots.map((slot) => {
                                                    const slotStart = new Date(slot.startTime);
                                                    const slotEnd = new Date(slot.endTime);
                                                    return (
                                                        <SelectItem key={slot._id} value={slot._id}>
                                                            {slotStart.toLocaleDateString()} {slotStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {slotEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label>Date</Label>
                                            <Input
                                                type="date"
                                                value={bookingDate}
                                                min={minBookingDate}
                                                max={maxBookingDate}
                                                onChange={(e) => handleBookingDateChange(e.target.value)}
                                                onBlur={handleBookingDateBlur}
                                                className={dateError ? "border-red-500 focus-visible:ring-red-500" : ""}
                                            />
                                            {dateError ? (
                                                <p className="text-sm text-red-600">{dateError}</p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    Book from today up to {new Date(maxBookingDate).toLocaleDateString()}.
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Start Time</Label>
                                            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Duration (hours)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="5"
                                                value={durationHours}
                                                onChange={(e) => setDurationHours(e.target.value)}
                                                className={durationError ? "border-red-500 focus-visible:ring-red-500" : ""}
                                            />
                                            {durationError && (
                                                <p className="text-sm text-red-600">{durationError}</p>
                                            )}
                                        </div>
                                    </div>

                                    {bookingSummary && station ? (() => {
                                        const feePerHour = station.reservationFeePerHour ?? 100;
                                        const totalFee = calculateTotalReservationFee(bookingSummary.hours, feePerHour);
                                        return (
                                        <div className="space-y-3 rounded-xl border bg-slate-50 p-4 text-sm">
                                            <div>
                                                <p className="mb-2 flex items-center gap-1.5 font-medium">
                                                    <Receipt className="h-3.5 w-3.5 text-primary" />
                                                    Booking summary
                                                </p>
                                                <div className="grid gap-1 sm:grid-cols-2 text-muted-foreground">
                                                    <p>Date: <span className="text-foreground">{bookingSummary.start.toLocaleDateString()}</span></p>
                                                    <p>Duration: <span className="text-foreground">{bookingSummary.hours} hour(s)</span></p>
                                                    <p>Start: <span className="text-foreground">{bookingSummary.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></p>
                                                    <p>End: <span className="text-foreground">{bookingSummary.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></p>
                                                </div>
                                            </div>

                                            <div className="rounded-lg border bg-white p-3">
                                                <div className="flex items-center justify-between gap-2 py-1">
                                                    <span className="text-muted-foreground">Charging Rate</span>
                                                    <span className="font-medium text-foreground">
                                                        {formatChargingRate(station.pricePerKwh)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 py-1">
                                                    <span className="text-muted-foreground">Reservation Fee</span>
                                                    <span className="font-medium text-foreground">
                                                        {formatReservationFee(feePerHour)} &times; {bookingSummary.hours} hour(s)
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 py-1">
                                                    <span className="text-muted-foreground">Refund Policy</span>
                                                    <span className="font-medium text-foreground">
                                                        {REFUND_POLICY_LABEL}
                                                    </span>
                                                </div>
                                                <div className="mt-2 border-t pt-2 flex items-center justify-between gap-2">
                                                    <span className="text-sm font-semibold">Total Pay Now</span>
                                                    <span className="text-base font-bold text-primary">
                                                        {formatReservationFee(totalFee)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                                                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                                <p>{RESERVATION_HELPER_NOTE}</p>
                                            </div>
                                        </div>
                                        );
                                    })() : null}

                                    <div className="rounded-xl border bg-background p-4 text-sm">
                                        <p className="mb-2 font-medium">Availability check</p>
                                        {checkingAvailability ? (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Checking availability...
                                            </div>
                                        ) : bookingAvailability ? (
                                            <div className="space-y-1">
                                                <p>Total Points: {bookingAvailability.totalChargingPoints}</p>
                                                <p>Available: {bookingAvailability.availablePoints}</p>
                                                <p>Occupied: {bookingAvailability.occupiedPoints}</p>
                                                <p className={bookingAvailability.canBook ? "font-medium text-green-600" : "font-medium text-red-600"}>
                                                    {bookingAvailability.canBook ? "Available for booking" : "Fully booked for selected time"}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground">Select date and time to check availability.</p>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handleBook}
                                        disabled={
                                            isClosed ||
                                            submittingBooking ||
                                            !bookingAvailability ||
                                            !bookingAvailability.canBook ||
                                            !!durationError ||
                                            !!dateError
                                        }
                                        className="h-11 w-full text-base font-semibold"
                                    >
                                        {isClosed ? "Station Closed" : submittingBooking ? "Processing..." : "Confirm & Pay"}
                                    </Button>

                                    {paymentStatus === "success" ? (
                                        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                                            <p className="font-medium">Payment successful</p>
                                            <p>Your booking has been confirmed.</p>
                                        </div>
                                    ) : null}
                                    {paymentStatus === "dismissed" ? (
                                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                                            <p className="font-medium">Payment cancelled</p>
                                            <p>You closed the payment window.</p>
                                        </div>
                                    ) : null}
                                    {paymentStatus === "error" ? (
                                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                            <p className="font-medium">Payment failed</p>
                                            <p>Something went wrong. Please try again.</p>
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border bg-white">
                            <CardContent className="space-y-4 p-5">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-lg font-semibold">Reviews ({reviews.length})</p>
                                </div>

                                {isSignedIn ? (
                                    <form onSubmit={handleReview} className="space-y-3 rounded-xl border bg-slate-50 p-4">
                                        <div className="flex flex-wrap gap-2">
                                            {[1, 2, 3, 4, 5].map((rating) => (
                                                <button
                                                    key={rating}
                                                    type="button"
                                                    onClick={() => setReviewRating(rating)}
                                                    className="rounded-md border bg-white p-1.5"
                                                    aria-label={`Rate ${rating} star${rating > 1 ? "s" : ""}`}
                                                    title={`${rating} Star${rating > 1 ? "s" : ""}`}
                                                >
                                                    <Star
                                                        className={`h-5 w-5 ${
                                                            rating <= reviewRating
                                                                ? "fill-yellow-500 text-yellow-500"
                                                                : "text-muted-foreground"
                                                        }`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        <Textarea
                                            placeholder="Write your review..."
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                            required
                                        />
                                        <Button type="submit" size="sm">Submit Review</Button>
                                    </form>
                                ) : null}

                                {reviews.length === 0 ? (
                                    <p className="py-4 text-center text-muted-foreground">No reviews yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {reviews.map((r) => (
                                            <div key={r._id} className="rounded-xl border bg-background p-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-slate-50 text-xs font-bold">
                                                            {r.userId?.name?.charAt(0) || "U"}
                                                        </div>
                                                        <span className="text-sm font-medium">{r.userId?.name || "User"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                                                        {r.rating}
                                                    </div>
                                                </div>
                                                <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="overflow-hidden border bg-white">
                            <div className="border-b px-4 py-3">
                                <p className="text-sm font-medium">Location</p>
                            </div>
                            <CardContent className="p-0">
                                <MapView
                                    stations={station ? [{
                                        _id: station._id,
                                        name: station.name,
                                        location: station.location,
                                    }] : []}
                                    center={{ lat: station.location.latitude, lng: station.location.longitude }}
                                    className="h-[250px]"
                                />
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border bg-white">
                            <CardContent className="min-w-0 space-y-4 p-5">
                                <p className="text-base font-semibold">Station info</p>
                                <InfoRow icon={<MapPin className="h-4 w-4 text-primary" />} label={station.city} />
                                {station.address ? <InfoRow icon={<MapPin className="h-4 w-4 text-primary" />} label={station.address} /> : null}
                                <InfoRow icon={<User className="h-4 w-4 text-primary" />} label={station.ownerId?.name || "Owner"} />
                                <InfoRow icon={<Zap className="h-4 w-4 text-primary" />} label={`${station.chargerType.split(",").map((t) => t.trim()).filter(Boolean).join(", ")} Charger`} />
                                <InfoRow icon={<Receipt className="h-4 w-4 text-primary" />} label={`Charging Rate: ${formatChargingRate(station.pricePerKwh)}`} />
                                <InfoRow icon={<Receipt className="h-4 w-4 text-primary" />} label={`Reservation Fee: ${formatReservationFeePerHour(station.reservationFeePerHour ?? 100)}`} />
                                {station.description ? (
                                    <StationDescription text={station.description} />
                                ) : null}

                                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                    <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                                        <Phone className="h-4 w-4" />
                                        Emergency Assistance
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">Call 078 188 8084-EV-HELP for 24/7 support.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
        </div>
    );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-xl border bg-slate-50 p-3">
            <div className="mb-1 flex items-center justify-center">{icon}</div>
            <p className="text-center text-xl font-semibold">{value}</p>
            <p className="text-center text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex min-w-0 items-start gap-2 text-sm">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span
                className="min-w-0 flex-1"
                style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
                {label}
            </span>
        </div>
    );
}
