"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Route, MapPin, Zap, Star, Navigation, Loader2, Battery,
    Search, CalendarCheck, Sparkles, SearchX, X,
    CircleDollarSign, SlidersHorizontal,
} from "lucide-react";

const CHARGER_TYPES = ["CCS", "CHAdeMO", "Type1", "Type2", "Tesla"];

interface StationResult {
    station: {
        _id: string;
        name: string;
        city: string;
        chargerType: string;
        pricePerKwh: number;
        rating: number;
        totalSlots: number;
        totalChargingPoints?: number;
        location: { latitude: number; longitude: number };
        availableSlots: number;
        availabilityStatus?: "Available" | "Limited Availability" | "Fully Booked";
    };
    score: number;
    distanceKm: number;
}

export default function TripPlannerPage() {
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [vehicleRange, setVehicleRange] = useState("200");
    const [chargerType, setChargerType] = useState("");
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [results, setResults] = useState<StationResult[]>([]);
    const [geoLoading, setGeoLoading] = useState(false);

    const useCurrentLocation = () => {
        if (!navigator.geolocation) return;
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLatitude(pos.coords.latitude.toString());
                setLongitude(pos.coords.longitude.toString());
                setGeoLoading(false);
            },
            () => setGeoLoading(false)
        );
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!latitude || !longitude) return;
        setLoading(true);
        setHasSearched(false);
        try {
            const res = await fetch("/api/recommendations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    vehicleRange: parseInt(vehicleRange) || 200,
                    chargerType: chargerType || undefined,
                }),
            });
            const data = await res.json();
            setResults(data.recommendations || []);
        } catch {
            setResults([]);
        } finally {
            setHasSearched(true);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50/60 via-white to-white">
            {/* Hero Header */}
            <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-[hsl(142,71%,35%)]/8 via-white to-green-50/80">
                <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-green-400/8 blur-3xl" />
                <div className="relative mx-auto max-w-7xl px-4 pt-28 pb-8 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Route className="h-5 w-5" />
                        <span className="text-sm font-semibold tracking-wide uppercase">Smart Recommendations</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        EV Trip{" "}
                        <span className="bg-gradient-to-r from-primary to-green-500 bg-clip-text text-transparent">Planner</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 max-w-xl">
                        Find the best charging stations near your location — powered by our recommendation engine.
                    </p>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Trip Form */}
                <Card className="mb-8 border-border/50 shadow-lg shadow-black/[0.03] overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-400 to-green-500" />
                    <CardContent className="p-6">
                        <form onSubmit={handleSearch}>
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                        <Navigation className="h-3.5 w-3.5 text-primary" /> Latitude
                                    </Label>
                                    <Input type="number" step="any" placeholder="e.g. 6.9271" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="h-11 rounded-xl" />
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5 text-red-500" /> Longitude
                                    </Label>
                                    <Input type="number" step="any" placeholder="e.g. 79.8612" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="h-11 rounded-xl" />
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                        <Battery className="h-3.5 w-3.5 text-primary" /> Vehicle Range (km)
                                    </Label>
                                    <Input type="number" placeholder="e.g. 200" value={vehicleRange} onChange={(e) => setVehicleRange(e.target.value)} className="h-11 rounded-xl" />
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                        <Zap className="h-3.5 w-3.5 text-amber-500" /> Connector Type
                                    </Label>
                                    <Select value={chargerType} onValueChange={setChargerType}>
                                        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Any connector" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="any">Any Connector</SelectItem>
                                            {CHARGER_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="mt-4">
                                <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={useCurrentLocation} disabled={geoLoading}>
                                    {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                                    Use My Current Location
                                </Button>
                            </div>

                            <Button type="submit" className="w-full mt-6 h-12 rounded-xl gap-2 text-base font-semibold" disabled={loading || !latitude || !longitude}>
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                {loading ? "Finding best stations…" : "Find Charging Stations"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )}

                {/* Results */}
                {hasSearched && !loading && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-sm text-muted-foreground">
                                Found <span className="font-semibold text-foreground">{results.length}</span> recommended station{results.length !== 1 ? "s" : ""}
                            </p>
                        </div>

                        {results.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-150" />
                                    <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-green-100 border border-border/50">
                                        <SearchX className="h-9 w-9 text-primary/60" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">No stations found</h3>
                                <p className="text-muted-foreground text-center max-w-md">
                                    No charging stations match your criteria. Try increasing your vehicle range or changing the connector type.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2">
                                {results.map((result, index) => (
                                    <RecommendationCard key={result.station._id} result={result} index={index} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Initial empty state */}
                {!hasSearched && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-150" />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-green-100 border border-border/50">
                                <Route className="h-9 w-9 text-primary/60" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Plan Your Trip</h3>
                        <p className="text-muted-foreground text-center max-w-md">
                            Enter your location and vehicle details to get personalized charging station recommendations.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Recommendation Card ───────────────────────────────── */

function RecommendationCard({ result, index }: { result: StationResult; index: number }) {
    const { station, score, distanceKm } = result;
    const hasAvailable = station.availableSlots > 0;
    const totalChargingPoints = station.totalChargingPoints || station.totalSlots;
    const statusLabel = station.availabilityStatus || (hasAvailable ? "Available" : "Fully Booked");

    return (
        <div
            className="group rounded-2xl border border-border/50 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 animate-fade-in"
            style={{ animationDelay: `${index * 80}ms` }}
        >
            <div className={`h-1.5 transition-all ${hasAvailable ? "bg-gradient-to-r from-green-400 via-emerald-400 to-green-500" : "bg-gradient-to-r from-orange-300 via-amber-400 to-orange-400"}`} />

            <div className="p-5">
                {/* Score badge */}
                <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        Match score: {score}
                    </span>
                </div>

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">{station.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{station.city}</span>
                            <span className="text-primary font-medium ml-1 whitespace-nowrap">{distanceKm} km away</span>
                        </div>
                    </div>
                    <Badge
                        variant={statusLabel === "Available" ? "success" : statusLabel === "Limited Availability" ? "warning" : "destructive"}
                        className="ml-2 shrink-0"
                    >
                        {statusLabel}
                    </Badge>
                </div>

                {/* Charger type */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/5 text-primary border border-primary/10 rounded-full px-2.5 py-0.5">
                        <Zap className="h-2.5 w-2.5" /> {station.chargerType}
                    </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-xl bg-gradient-to-br from-muted/30 to-muted/50 p-2.5 text-center">
                        <div className="text-xs text-muted-foreground">Price</div>
                        <div className="font-bold text-sm text-foreground">LKR {station.pricePerKwh} / kWh</div>
                        <div className="text-[10px] text-muted-foreground">Price per kWh</div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-muted/30 to-muted/50 p-2.5 text-center">
                        <div className="text-xs text-muted-foreground">Rating</div>
                        <div className="font-bold text-sm text-foreground flex items-center justify-center gap-0.5">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /> {station.rating?.toFixed(1) || "—"}
                        </div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-muted/30 to-muted/50 p-2.5 text-center">
                        <div className="text-xs text-muted-foreground">Available Now</div>
                        <div className="font-bold text-sm text-foreground">{station.availableSlots}/{totalChargingPoints}</div>
                        <div className="text-[10px] text-muted-foreground">charging points</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <Link href={`/stations/${station._id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full rounded-lg text-xs gap-1.5 h-9">
                            <Search className="h-3 w-3" /> View Details
                        </Button>
                    </Link>
                    <Link href={`/stations/${station._id}?book=true#booking-section`} className="flex-1">
                        <Button size="sm" className="w-full rounded-lg text-xs gap-1.5 h-9" disabled={!hasAvailable}>
                            <CalendarCheck className="h-3 w-3" /> {hasAvailable ? "Book Slot" : "Unavailable"}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
