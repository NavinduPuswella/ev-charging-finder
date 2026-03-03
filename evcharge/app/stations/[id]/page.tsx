"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import MapView from "@/components/map-view";
import { MapPin, Star, Zap, DollarSign, Clock, CalendarCheck, User, Loader2, Phone } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

interface Station {
    _id: string;
    name: string;
    city: string;
    chargerType: string;
    pricePerKwh: number;
    rating: number;
    totalSlots: number;
    location: { latitude: number; longitude: number };
    address?: string;
    description?: string;
    ownerId?: { name: string; email: string };
}

interface SlotData {
    _id: string;
    startTime: string;
    endTime: string;
    status: string;
}

interface Review {
    _id: string;
    rating: number;
    comment: string;
    createdAt: string;
    userId: { name: string };
}

export default function StationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const [station, setStation] = useState<Station | null>(null);
    const [slots, setSlots] = useState<SlotData[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingSlot, setBookingSlot] = useState<string>("");
    const [bookingDate, setBookingDate] = useState("");
    const [bookingDuration, setBookingDuration] = useState("1");
    const [bookingDialog, setBookingDialog] = useState(false);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewRating, setReviewRating] = useState("5");

    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch(`/api/stations/${id}`);
            const data = await res.json();
            setStation(data.station);
            setSlots(data.slots || []);
            setReviews(data.reviews || []);
            setLoading(false);
        };
        fetchData();
    }, [id]);

    const handleBook = async () => {
        if (!isSignedIn) { router.push("/sign-in"); return; }
        const res = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stationId: id, slotId: bookingSlot, date: bookingDate, duration: Number(bookingDuration) }),
        });
        const data = await res.json();
        if (res.ok) {
            setSlots((prev) => prev.map((s) => s._id === bookingSlot ? { ...s, status: "BOOKED" } : s));
            setBookingDialog(false);
            alert(data.message || "Booking confirmed!");
        } else {
            alert(data.error || "Booking failed");
        }
    };

    const handleReview = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/api/stations/${id}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating: Number(reviewRating), comment: reviewComment }),
        });
        if (res.ok) {
            const data = await res.json();
            setReviews((prev) => [data.review, ...prev]);
            setReviewComment("");
        } else {
            const data = await res.json();
            alert(data.error || "Failed to submit review");
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!station) {
        return <div className="flex justify-center py-20 text-muted-foreground">Station not found</div>;
    }

    const availableSlots = slots.filter((s) => s.status === "AVAILABLE");

    return (
        <div className="min-h-[calc(100vh-4rem)]">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-white border-b border-border">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">{station.name}</h1>
                            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{station.city}</span>
                                <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" />{station.rating.toFixed(1)}</span>
                                <Badge variant="success"><Zap className="h-3 w-3 mr-1" />{station.chargerType}</Badge>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Dialog open={bookingDialog} onOpenChange={setBookingDialog}>
                                <DialogTrigger asChild>
                                    <Button size="lg" className="gap-2 shadow-lg shadow-primary/25" disabled={availableSlots.length === 0}>
                                        <CalendarCheck className="h-5 w-5" />
                                        {availableSlots.length > 0 ? "Book Now" : "No Slots Available"}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Book a Slot</DialogTitle>
                                        <DialogDescription>Select a slot, date, and duration to book</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Select Slot</Label>
                                            <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" value={bookingSlot} onChange={(e) => setBookingSlot(e.target.value)}>
                                                <option value="">Choose a slot</option>
                                                {availableSlots.map((s) => (
                                                    <option key={s._id} value={s._id}>
                                                        {new Date(s.startTime).toLocaleString()} - {new Date(s.endTime).toLocaleString()}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Date</Label>
                                            <Input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Duration (hours)</Label>
                                            <Input type="number" min="1" max="8" value={bookingDuration} onChange={(e) => setBookingDuration(e.target.value)} />
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                                            <p className="font-medium">Estimated Cost</p>
                                            <p className="text-2xl font-bold text-primary">
                                                ${(station.pricePerKwh * Number(bookingDuration) * 10).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleBook} disabled={!bookingSlot || !bookingDate} className="w-full">Confirm & Pay</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Info Cards */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Card><CardContent className="p-4 text-center"><DollarSign className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-2xl font-bold">${station.pricePerKwh}</p><p className="text-xs text-muted-foreground">per kWh</p></CardContent></Card>
                            <Card><CardContent className="p-4 text-center"><Zap className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-2xl font-bold">{station.totalSlots}</p><p className="text-xs text-muted-foreground">Total Slots</p></CardContent></Card>
                            <Card><CardContent className="p-4 text-center"><Clock className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-2xl font-bold">{availableSlots.length}</p><p className="text-xs text-muted-foreground">Available Now</p></CardContent></Card>
                        </div>

                        {/* Slots */}
                        <Card>
                            <CardHeader><CardTitle>Available Slots</CardTitle></CardHeader>
                            <CardContent>
                                {slots.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-4">No slots configured yet.</p>
                                ) : (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {slots.map((slot) => (
                                            <div key={slot._id} className={`flex items-center justify-between p-3 rounded-lg border ${slot.status === "AVAILABLE" ? "border-green-200 bg-green-50" : "border-border bg-muted/30"}`}>
                                                <div className="text-sm">
                                                    <p className="font-medium">{new Date(slot.startTime).toLocaleTimeString()} - {new Date(slot.endTime).toLocaleTimeString()}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(slot.startTime).toLocaleDateString()}</p>
                                                </div>
                                                <Badge variant={slot.status === "AVAILABLE" ? "success" : "secondary"}>{slot.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Reviews */}
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

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <MapView stations={station ? [station] : []} className="h-[250px]" />
                        <Card>
                            <CardHeader><CardTitle className="text-base">Station Info</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span>{station.city}</span></div>
                                {station.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span>{station.address}</span></div>}
                                <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /><span>{station.ownerId?.name || "Owner"}</span></div>
                                <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /><span>{station.chargerType} Charger</span></div>
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
