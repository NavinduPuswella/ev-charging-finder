"use client";

import { useEffect, useMemo, useRef, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MapView from "@/components/map-view";
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
} from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";

interface Station {
    _id: string;
    name: string;
    city: string;
    chargerType: string;
    pricePerKwh: number;
    rating: number;
    totalSlots: number;
    totalChargingPoints?: number;
    availableNow?: number;
    occupiedNow?: number;
    availabilityStatus?: "Available" | "Limited Availability" | "Fully Booked";
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

function getTodayDateString() {
    const now = new Date();
    return now.toISOString().split("T")[0];
}

function getNextHourTimeString() {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    return now.toTimeString().slice(0, 5);
}

function formatLkr(value: number) {
    return `LKR ${value} / kWh`;
}

function toLocalDateInputValue(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (searchParams.get("book") === "true" && bookingSectionRef.current) {
            setTimeout(() => {
                bookingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 150);
        }
    }, [searchParams]);

    useEffect(() => {
        const run = async () => {
            if (!station) return;

            const parsedDuration = Number(durationHours);
            if (!bookingDate || !startTime || parsedDuration < 1) {
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
        const duration = Math.max(1, Math.round(durationMs / (1000 * 60 * 60)));

        setBookingDate(toLocalDateInputValue(slot.startTime));
        setStartTime(toLocalTimeInputValue(slot.startTime));
        setDurationHours(String(duration));
    }, [selectedSlotId, slots]);

    const bookingSummary = useMemo(() => {
        if (!bookingDate || !startTime) return null;

        const start = new Date(`${bookingDate}T${startTime}:00`);
        if (Number.isNaN(start.getTime())) return null;

        const hours = Number(durationHours) || 1;
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
                alert(bookingData.error || "Booking failed");
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
                alert("Failed to initialize payment");
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
                    alert("Payment completed, but booking confirmation failed. Please contact support.");
                    return;
                }

                setPaymentStatus("success");
                setSubmittingBooking(false);
                refreshStation();
            };

            payhereGlobal.onDismissed = function onDismissed() {
                setPaymentStatus("dismissed");
                setSubmittingBooking(false);
                fetch(`/api/bookings/${bookingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "CANCELLED" }),
                });
            };

            payhereGlobal.onError = function onError() {
                setPaymentStatus("error");
                setSubmittingBooking(false);
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
            alert("Something went wrong. Please try again.");
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
        } else {
            alert(data.error || "Failed to submit review");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20 mt-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!station) {
        return <div className="flex justify-center py-20 mt-16 text-muted-foreground">Station not found</div>;
    }

    const totalChargingPoints = station.totalChargingPoints || station.totalSlots;
    const availableNow = station.availableNow ?? 0;
    const occupiedNow = station.occupiedNow ?? 0;
    const availableSlots = slots
        .filter((slot) => slot.status === "AVAILABLE")
        .filter((slot) => new Date(slot.endTime).getTime() > Date.now())
        .sort(
            (a, b) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/20">
            <div className="border-b border-border bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),_transparent_52%)]">
                <div className="mx-auto max-w-7xl px-4 py-8 pt-24 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-background/85 p-6 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">{station.name}</h1>
                            <div className="flex items-center gap-3 mt-2 text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{station.city}</span>
                                <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" />{station.rating.toFixed(1)}</span>
                                <Badge variant="success"><Zap className="h-3 w-3 mr-1" />{station.chargerType}</Badge>
                                <Badge variant={getAvailabilityBadge(station.availabilityStatus)}>{station.availabilityStatus}</Badge>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                size="lg"
                                className="gap-2 shadow-sm"
                                disabled={availableNow <= 0}
                                onClick={() => bookingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                            >
                                <CalendarCheck className="h-5 w-5" />
                                {availableNow > 0 ? "Book Slot" : "Fully Booked"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Card className="border-primary/30 bg-primary/5"><CardContent className="p-4 text-center"><Zap className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-2xl font-bold">{totalChargingPoints}</p><p className="text-xs text-muted-foreground">Total Points</p></CardContent></Card>
                            <Card className="border-emerald-400/30 bg-emerald-500/5"><CardContent className="p-4 text-center"><Clock className="h-6 w-6 text-emerald-600 mx-auto mb-1" /><p className="text-2xl font-bold">{availableNow}</p><p className="text-xs text-muted-foreground">Available Now</p></CardContent></Card>
                            <Card className="border-amber-400/30 bg-amber-500/5"><CardContent className="p-4 text-center"><Timer className="h-6 w-6 text-amber-600 mx-auto mb-1" /><p className="text-2xl font-bold">{occupiedNow}</p><p className="text-xs text-muted-foreground">Occupied Now</p></CardContent></Card>
                        </div>

                        <Card ref={bookingSectionRef} id="booking-section" className="border-primary/20 shadow-sm">
                            <CardHeader className="border-b border-border/60 bg-muted/20">
                                <CardTitle className="text-xl">Book Slot</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2 sm:col-span-3">
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
                                        <p className="text-xs text-muted-foreground">
                                            Pick a predefined slot or continue with manual booking.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date</Label>
                                        <Input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Start Time</Label>
                                        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Duration (hours)</Label>
                                        <Input type="number" min="1" max="12" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
                                    </div>
                                </div>

                                {bookingSummary && (
                                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                                        <p className="font-medium mb-1">Booking Summary</p>
                                        <p>Date: {bookingSummary.start.toLocaleDateString()}</p>
                                        <p>Start: {bookingSummary.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                        <p>End: {bookingSummary.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                        <p>Duration: {bookingSummary.hours} hour(s)</p>
                                        <p className="font-semibold text-primary mt-1">Price: {formatLkr(station.pricePerKwh)}</p>
                                    </div>
                                )}

                                <div className="rounded-xl border border-border bg-background p-4 text-sm">
                                    <p className="font-medium mb-2">Availability</p>
                                    {checkingAvailability ? (
                                        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking...</div>
                                    ) : bookingAvailability ? (
                                        <div className="space-y-1">
                                            <p>Total Points: {bookingAvailability.totalChargingPoints}</p>
                                            <p>Available: {bookingAvailability.availablePoints}</p>
                                            <p>Occupied: {bookingAvailability.occupiedPoints}</p>
                                            <p className={bookingAvailability.canBook ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                                {bookingAvailability.canBook ? "Available" : "Fully Booked for selected time"}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">Select date and time to check.</p>
                                    )}
                                </div>

                                <Button
                                    onClick={handleBook}
                                    disabled={submittingBooking || !bookingAvailability || !bookingAvailability.canBook}
                                    className="w-full h-11 text-base font-semibold"
                                >
                                    {submittingBooking ? "Processing..." : "Confirm & Pay"}
                                </Button>

                                {paymentStatus === "success" && (
                                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                                        <p className="font-medium">Payment Successful</p>
                                        <p>Your booking has been confirmed.</p>
                                    </div>
                                )}
                                {paymentStatus === "dismissed" && (
                                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
                                        <p className="font-medium">Payment Cancelled</p>
                                        <p>You closed the payment window.</p>
                                    </div>
                                )}
                                {paymentStatus === "error" && (
                                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                                        <p className="font-medium">Payment Failed</p>
                                        <p>Something went wrong. Please try again.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader><CardTitle>Reviews ({reviews.length})</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {isSignedIn && (
                                    <form onSubmit={handleReview} className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                                        <div className="flex gap-3">
                                            <div className="flex items-center gap-1 rounded-lg border border-input bg-background px-2">
                                                {[1, 2, 3, 4, 5].map((rating) => (
                                                    <button
                                                        key={rating}
                                                        type="button"
                                                        onClick={() => setReviewRating(rating)}
                                                        className="p-1"
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
                                            <Textarea placeholder="Write your review..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} className="flex-1" required />
                                        </div>
                                        <Button type="submit" size="sm">Submit Review</Button>
                                    </form>
                                )}
                                <Separator />
                                {reviews.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-4">No reviews yet.</p>
                                ) : (
                                    reviews.map((r) => (
                                        <div key={r._id} className="flex gap-3 p-3 rounded-lg">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                                                {r.userId?.name?.charAt(0) || "U"}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-sm">{r.userId?.name || "User"}</span>
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />{r.rating}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <MapView
                            stations={station ? [{
                                _id: station._id,
                                name: station.name,
                                location: station.location,
                            }] : []}
                            center={{ lat: station.location.latitude, lng: station.location.longitude }}
                            className="h-[250px] rounded-xl overflow-hidden border border-border shadow-sm"
                        />
                        <Card className="shadow-sm">
                            <CardHeader><CardTitle className="text-base">Station Info</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span>{station.city}</span></div>
                                {station.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span>{station.address}</span></div>}
                                <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /><span>{station.ownerId?.name || "Owner"}</span></div>
                                <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /><span>{station.chargerType} Charger</span></div>
                                <div className="text-sm text-muted-foreground">Price: {formatLkr(station.pricePerKwh)}</div>
                                {station.description && (
                                    <div className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                                        {station.description}
                                    </div>
                                )}
                                <Separator />
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                                    <div className="flex items-center gap-2 text-red-600 font-medium text-sm"><Phone className="h-4 w-4" /> Emergency Assistance</div>
                                    <p className="text-xs text-muted-foreground mt-1">Call 1-800-EV-HELP for 24/7 support</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
