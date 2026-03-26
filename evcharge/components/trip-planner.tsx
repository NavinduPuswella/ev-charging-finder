"use client";

import { type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import MapView, { type MapPointWithLabel } from "@/components/map-view";
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
    Search, CalendarCheck, Sparkles, SearchX, AlertTriangle, Map, ShieldCheck,
    Clock3, Gauge, TrendingUp,
} from "lucide-react";

const CHARGER_TYPES = ["CCS", "CHAdeMO", "Type1", "Type2", "Tesla"];

interface Coordinates {
    lat: number;
    lng: number;
}

interface RouteStation {
    _id: string;
    name: string;
    city: string;
    chargerType: string;
    pricePerKwh: number;
    rating: number;
    availableNow: number;
    totalChargingPoints: number;
    availabilityStatus: "Available" | "Limited Availability" | "Fully Booked";
    location: { latitude: number; longitude: number };
    distanceToRouteKm: number;
    distanceFromStartKm: number;
}

interface TripPlanResponse {
    route: {
        distanceKm: number;
        durationMinutes: number;
        routePath: Array<{ lat: number; lng: number }>;
    };
    safety: {
        vehicleRangeKm: number;
        planningRangeKm: number;
        canReachDestination: boolean;
        note: string;
    };
    stationsOnRoute: RouteStation[];
    recommendedStops: RouteStation[];
}

async function geocodeLocation(query: string): Promise<Coordinates | null> {
    if (!query.trim()) return null;

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { "Accept-Language": "en" } }
    );
    if (!response.ok) return null;

    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!data[0]) return null;

    return {
        lat: Number(data[0].lat),
        lng: Number(data[0].lon),
    };
}

export default function TripPlanner() {
    const [originText, setOriginText] = useState("");
    const [destinationText, setDestinationText] = useState("");
    const [originCoords, setOriginCoords] = useState<Coordinates | null>(null);
    const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null);
    const [vehicleRange, setVehicleRange] = useState("250");
    const [chargerType, setChargerType] = useState("any");
    const [corridorKm, setCorridorKm] = useState("7");
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [result, setResult] = useState<TripPlanResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);

    const useCurrentLocation = () => {
        if (!navigator.geolocation) return;
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setOriginCoords(current);
                setOriginText("Current Location");
                setGeoLoading(false);
            },
            () => setGeoLoading(false)
        );
    };

    const resolveOrigin = async () => originCoords || geocodeLocation(originText);
    const resolveDestination = async () => destinationCoords || geocodeLocation(destinationText);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setHasSearched(false);
        setError(null);

        try {
            const resolvedOrigin = await resolveOrigin();
            const resolvedDestination = await resolveDestination();

            if (!resolvedOrigin || !resolvedDestination) {
                setResult(null);
                setError("Please enter valid origin and destination locations.");
                return;
            }

            setOriginCoords(resolvedOrigin);
            setDestinationCoords(resolvedDestination);

            const res = await fetch("/api/trip-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    origin: resolvedOrigin,
                    destination: resolvedDestination,
                    vehicleRangeKm: parseInt(vehicleRange, 10) || 250,
                    chargerType: chargerType === "any" ? undefined : chargerType,
                    corridorKm: parseFloat(corridorKm) || 7,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setResult(null);
                setError(data.error || "Failed to plan trip.");
                return;
            }

            setResult(data as TripPlanResponse);
        } catch (requestError) {
            setResult(null);
            setError(requestError instanceof Error ? requestError.message : "Failed to plan trip.");
        } finally {
            setHasSearched(true);
            setLoading(false);
        }
    };

    const mapOrigin: MapPointWithLabel | undefined = originCoords
        ? { lat: originCoords.lat, lng: originCoords.lng, label: "Origin" }
        : undefined;
    const mapDestination: MapPointWithLabel | undefined = destinationCoords
        ? { lat: destinationCoords.lat, lng: destinationCoords.lng, label: "Destination" }
        : undefined;

    const highlightedStationIds = useMemo(
        () => result?.recommendedStops.map((station) => station._id) || [],
        [result]
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100/70">
            <section className="border-b border-border/50 bg-background/80 backdrop-blur">
                <div className="mx-auto max-w-7xl px-4 pb-8 pt-28 sm:px-6 lg:px-8">
                    <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
                        <Route className="mr-1 h-3.5 w-3.5" />
                        EV Trip Planner
                    </Badge>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Plan Better Charging Stops</h1>
                    <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                        Enter your start and destination, and get route-aware station recommendations, safety guidance, and direct booking shortcuts.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Route-Safe Suggestions</Badge>
                        <Badge variant="secondary" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Smart Stop Ranking</Badge>
                        <Badge variant="secondary" className="gap-1.5"><CalendarCheck className="h-3.5 w-3.5" /> Quick Pre-Booking</Badge>
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <Card className="sticky top-24 overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
                            <div className="h-1 bg-gradient-to-r from-primary via-blue-500 to-emerald-500" />
                            <CardContent className="p-5">
                                <div className="mb-5">
                                    <p className="text-sm font-semibold text-foreground">Trip inputs</p>
                                    <p className="text-xs text-muted-foreground">
                                        Tune route filters to get realistic charging options.
                                    </p>
                                </div>

                                <form onSubmit={handleSearch} className="space-y-4">
                                    <Field label="Origin" icon={<Navigation className="h-3.5 w-3.5 text-primary" />}>
                                        <Input
                                            placeholder="e.g. Colombo Fort"
                                            value={originText}
                                            onChange={(e) => {
                                                setOriginText(e.target.value);
                                                setOriginCoords(null);
                                            }}
                                            className="h-11"
                                        />
                                    </Field>

                                    <Field label="Destination" icon={<MapPin className="h-3.5 w-3.5 text-red-500" />}>
                                        <Input
                                            placeholder="e.g. Kandy Clock Tower"
                                            value={destinationText}
                                            onChange={(e) => {
                                                setDestinationText(e.target.value);
                                                setDestinationCoords(null);
                                            }}
                                            className="h-11"
                                        />
                                    </Field>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                        <Field label="Vehicle Range (km)" icon={<Battery className="h-3.5 w-3.5 text-primary" />}>
                                            <Input
                                                type="number"
                                                placeholder="250"
                                                value={vehicleRange}
                                                onChange={(e) => setVehicleRange(e.target.value)}
                                                className="h-11"
                                            />
                                        </Field>

                                        <Field label="Route Corridor (km)" icon={<Map className="h-3.5 w-3.5 text-primary" />}>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="20"
                                                value={corridorKm}
                                                onChange={(e) => setCorridorKm(e.target.value)}
                                                className="h-11"
                                            />
                                        </Field>
                                    </div>

                                    <Field label="Connector Type" icon={<Zap className="h-3.5 w-3.5 text-amber-500" />}>
                                        <Select value={chargerType} onValueChange={setChargerType}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Any connector" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="any">Any Connector</SelectItem>
                                                {CHARGER_TYPES.map((connector) => (
                                                    <SelectItem key={connector} value={connector}>
                                                        {connector}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={useCurrentLocation}
                                            disabled={geoLoading}
                                        >
                                            {geoLoading
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <Navigation className="h-3.5 w-3.5" />}
                                            Use Current Location
                                        </Button>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="h-12 w-full gap-2 text-base font-semibold"
                                        disabled={loading || !originText || !destinationText}
                                    >
                                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                        {loading ? "Planning your route..." : "Plan EV Trip"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6 lg:col-span-8">
                        <Card className="overflow-hidden border-border/60 bg-white/90">
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="flex h-[420px] items-center justify-center">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    </div>
                                ) : result ? (
                                    <MapView
                                        className="h-[420px]"
                                        stations={result.stationsOnRoute}
                                        routePath={result.route.routePath}
                                        origin={mapOrigin}
                                        destination={mapDestination}
                                        highlightedStationIds={highlightedStationIds}
                                    />
                                ) : (
                                    <div className="flex h-[420px] flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white px-6 text-center">
                                        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
                                            <Route className="h-8 w-8 text-primary" />
                                        </div>
                                        <p className="text-lg font-semibold">Your route preview appears here</p>
                                        <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                            Start by entering origin and destination, then plan your trip to see stations and suggested stops on the map.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-border/60 bg-white/90">
                            <CardContent className="p-5">
                                <p className="text-sm font-semibold text-foreground">How this planner helps</p>
                                <ul className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                                    <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-primary" /> Finds stations along your route, not just nearby.</li>
                                    <li className="flex items-start gap-2"><Gauge className="mt-0.5 h-4 w-4 text-primary" /> Uses your battery range to keep travel realistic.</li>
                                    <li className="flex items-start gap-2"><TrendingUp className="mt-0.5 h-4 w-4 text-primary" /> Prioritizes practical charging stops first.</li>
                                    <li className="flex items-start gap-2"><CalendarCheck className="mt-0.5 h-4 w-4 text-primary" /> Lets you pre-book directly from results.</li>
                                </ul>
                            </CardContent>
                        </Card>

                        {hasSearched && !loading && (
                            <div className="animate-fade-in space-y-6">
                                {error && (
                                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                                            <p className="text-sm text-destructive">{error}</p>
                                        </div>
                                    </div>
                                )}

                                {!error && result && (
                                    <>
                                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                            <StatCard
                                                label="Route Distance"
                                                value={`${result.route.distanceKm} km`}
                                                tone="primary"
                                                icon={<Route className="h-4 w-4" />}
                                            />
                                            <StatCard
                                                label="Estimated Duration"
                                                value={`${result.route.durationMinutes} min`}
                                                tone="blue"
                                                icon={<Clock3 className="h-4 w-4" />}
                                            />
                                            <StatCard
                                                label="Suggested Stops"
                                                value={`${result.recommendedStops.length}`}
                                                tone="emerald"
                                                icon={<Zap className="h-4 w-4" />}
                                            />
                                            <StatCard
                                                label="Planning Range"
                                                value={`${result.safety.planningRangeKm} km`}
                                                tone="slate"
                                                icon={<Battery className="h-4 w-4" />}
                                            />
                                        </div>

                                        <div className={`rounded-xl border p-4 ${result.safety.canReachDestination ? "border-primary/30 bg-primary/5" : "border-orange-300 bg-orange-50"}`}>
                                            <p className="text-sm font-semibold">
                                                {result.safety.canReachDestination ? "Trip is feasible with this plan" : "Trip may not be guaranteed"}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">{result.safety.note}</p>
                                        </div>

                                        {result.recommendedStops.length > 0 && (
                                            <section>
                                                <div className="mb-3 flex items-center justify-between gap-2">
                                                    <h3 className="font-semibold">Suggested charging stops</h3>
                                                    <Badge variant="secondary">{result.recommendedStops.length} recommended</Badge>
                                                </div>
                                                <div className="grid gap-4 xl:grid-cols-2">
                                                    {result.recommendedStops.map((station, index) => (
                                                        <RouteStopCard key={`${station._id}-${index}`} station={station} index={index} />
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        <section>
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <h3 className="font-semibold">All stations on route</h3>
                                                <Badge variant="outline">{result.stationsOnRoute.length} stations</Badge>
                                            </div>

                                            {result.stationsOnRoute.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
                                                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
                                                        <SearchX className="h-6 w-6 text-muted-foreground" />
                                                    </div>
                                                    <p className="text-base font-semibold">No route stations found</p>
                                                    <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
                                                        Increase corridor distance or try a different connector type.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="grid gap-4 xl:grid-cols-2">
                                                    {result.stationsOnRoute.map((station, index) => (
                                                        <RouteStopCard key={station._id} station={station} index={index} />
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
    return (
        <div>
            <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {icon} {label}
            </Label>
            {children}
        </div>
    );
}

function StatCard({
    label,
    value,
    tone,
    icon,
}: {
    label: string;
    value: string;
    tone: "primary" | "blue" | "emerald" | "slate";
    icon: ReactNode;
}) {
    const toneClass = tone === "primary"
        ? "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
        : tone === "blue"
            ? "border-blue-200 bg-gradient-to-br from-blue-50 to-transparent"
            : tone === "emerald"
                ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-transparent"
                : "border-slate-200 bg-gradient-to-br from-slate-100 to-transparent";

    return (
        <Card className={toneClass}>
            <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <span className="text-muted-foreground">{icon}</span>
                </div>
                <p className="text-xl font-semibold">{value}</p>
            </CardContent>
        </Card>
    );
}

function RouteStopCard({ station, index }: { station: RouteStation; index: number }) {
    const hasAvailable = station.availableNow > 0;

    return (
        <div
            className="animate-fade-in overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ animationDelay: `${index * 80}ms` }}
        >
            <div className={`h-1 ${hasAvailable ? "bg-primary" : "bg-orange-400"}`} />

            <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold">{station.name}</h3>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{station.city}</span>
                            <span className="ml-1 whitespace-nowrap font-medium text-primary">{station.distanceFromStartKm.toFixed(1)} km</span>
                        </div>
                    </div>
                    <Badge
                        variant={station.availabilityStatus === "Available" ? "success" : station.availabilityStatus === "Limited Availability" ? "warning" : "destructive"}
                        className="ml-2 shrink-0"
                    >
                        {station.availabilityStatus}
                    </Badge>
                </div>

                <div className="mb-4 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <Zap className="h-2.5 w-2.5" /> {station.chargerType}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        <Sparkles className="h-2.5 w-2.5" /> {station.distanceToRouteKm.toFixed(1)} km off route
                    </span>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                        <div className="text-xs text-muted-foreground">Price</div>
                        <div className="text-sm font-bold text-foreground">LKR {station.pricePerKwh}</div>
                        <div className="text-[10px] text-muted-foreground">per kWh</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                        <div className="text-xs text-muted-foreground">Rating</div>
                        <div className="flex items-center justify-center gap-0.5 text-sm font-bold text-foreground">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" /> {station.rating?.toFixed(1) || "—"}
                        </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                        <div className="text-xs text-muted-foreground">Available</div>
                        <div className="text-sm font-bold text-foreground">{station.availableNow}/{station.totalChargingPoints}</div>
                        <div className="text-[10px] text-muted-foreground">points</div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Link href={`/stations/${station._id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="h-9 w-full gap-1.5 text-xs">
                            <Search className="h-3 w-3" /> View Details
                        </Button>
                    </Link>
                    <Link href={`/stations/${station._id}?book=true#booking-section`} className="flex-1">
                        <Button size="sm" className="h-9 w-full gap-1.5 text-xs" disabled={!hasAvailable}>
                            <CalendarCheck className="h-3 w-3" /> {hasAvailable ? "Pre-Book Slot" : "Unavailable"}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
