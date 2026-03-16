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
import { useAuth } from "@clerk/nextjs";

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
    const [reviewComment, setReviewComment] = useState("");
    const [reviewRating, setReviewRating] = useState("5");

    const refreshStation = async () => {
        const res = await fetch(`/api/stations/${id}`);
        const data = await res.json();
        setStation(data.station);
        setReviews(data.reviews || []);
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
        try {
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stationId: id,
                    bookingDate,
                    startTime,
                    durationHours: bookingSummary.hours,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Booking failed");
                return;
            }

            alert(data.message || "Booking confirmed");
            await refreshStation();
        } finally {
            setSubmittingBooking(false);
        }
    };

    const handleReview = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/api/stations/${id}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating: Number(reviewRating), comment: reviewComment }),
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
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!station) {
        return <div className="flex justify-center py-20 text-muted-foreground">Station not found</div>;
    }

    const totalChargingPoints = station.totalChargingPoints || station.totalSlots;
    const availableNow = station.availableNow ?? 0;
    const occupiedNow = station.occupiedNow ?? 0;

    return (
        <div className="min-h-[calc(100vh-4rem)]">
            <div className="bg-gradient-to-r from-green-50 to-white border-b border-border">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
                                className="gap-2 shadow-lg shadow-primary/25"
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
                            <Card><CardContent className="p-4 text-center"><Zap className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-2xl font-bold">{totalChargingPoints}</p><p className="text-xs text-muted-foreground">Total Charging Points</p></CardContent></Card>
                            <Card><CardContent className="p-4 text-center"><Clock className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-2xl font-bold">{availableNow}</p><p className="text-xs text-muted-foreground">Available Now</p></CardContent></Card>
                            <Card><CardContent className="p-4 text-center"><Timer className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-2xl font-bold">{occupiedNow}</p><p className="text-xs text-muted-foreground">Occupied Now</p></CardContent></Card>
                        </div>

                        <Card ref={bookingSectionRef} id="booking-section">
                            <CardHeader><CardTitle>Book Slot</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>Date</Label>
                                        <Input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Start Time</Label>
                                        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Booking Duration (hours)</Label>
                                        <Input type="number" min="1" max="12" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
                                    </div>
                                </div>

                                {bookingSummary && (
                                    <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm">
                                        <p className="font-medium mb-1">Booking Summary</p>
                                        <p>Date: {bookingSummary.start.toLocaleDateString()}</p>
                                        <p>Start: {bookingSummary.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                        <p>End: {bookingSummary.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                        <p>Duration: {bookingSummary.hours} hour(s)</p>
                                        <p className="font-semibold text-primary mt-1">Price per kWh: {formatLkr(station.pricePerKwh)}</p>
                                    </div>
                                )}

                                <div className="rounded-lg border p-3 text-sm">
                                    <p className="font-medium mb-2">Availability Result</p>
                                    {checkingAvailability ? (
                                        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking availability...</div>
                                    ) : bookingAvailability ? (
                                        <div className="space-y-1">
                                            <p>Total Charging Points: {bookingAvailability.totalChargingPoints}</p>
                                            <p>Available for selected time: {bookingAvailability.availablePoints}</p>
                                            <p>Occupied for selected time: {bookingAvailability.occupiedPoints}</p>
                                            <p className={bookingAvailability.canBook ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                                {bookingAvailability.canBook ? "Available" : "Fully Booked for selected time"}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">Select date and time to check availability.</p>
                                    )}
                                </div>

                                <Button
                                    onClick={handleBook}
                                    disabled={
                                        submittingBooking ||
                                        !bookingAvailability ||
                                        !bookingAvailability.canBook
                                    }
                                    className="w-full"
                                >
                                    {submittingBooking ? "Confirming..." : "Confirm Booking"}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Reviews ({reviews.length})</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {isSignedIn && (
                                    <form onSubmit={handleReview} className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                                        <div className="flex gap-3">
                                            <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={reviewRating} onChange={(e) => setReviewRating(e.target.value)}>
                                                {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Stars</option>)}
                                            </select>
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
                                        <div key={r._id} className="flex gap-3 p-3 rounded-lg hover:bg-muted/30">
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
                            className="h-[250px]"
                        />
                        <Card>
                            <CardHeader><CardTitle className="text-base">Station Info</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span>{station.city}</span></div>
                                {station.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span>{station.address}</span></div>}
                                <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /><span>{station.ownerId?.name || "Owner"}</span></div>
                                <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /><span>{station.chargerType} Charger</span></div>
                                <div className="text-sm text-muted-foreground">Price per kWh: {formatLkr(station.pricePerKwh)}</div>
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
