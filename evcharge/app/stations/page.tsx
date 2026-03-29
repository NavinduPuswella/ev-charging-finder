"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Search, MapPin, Zap, Star, Clock, Filter,
    SlidersHorizontal, X, Gauge, CircleDollarSign, CalendarCheck,
    Loader2, BatteryCharging, SearchX, Navigation, LocateFixed, ArrowRight,
} from "lucide-react";

interface Station {
    _id: string;
    name: string;
    city: string;
    chargerType: string;
    pricePerKwh: number;
    rating: number;
    totalSlots: number;
    totalChargingPoints?: number;
    location: { latitude: number; longitude: number };
    isApproved: boolean;
    address?: string;
    description?: string;
    availableNow?: number;
    occupiedNow?: number;
    availabilityStatus?: "Available" | "Limited Availability" | "Fully Booked";
}

const CHARGER_OPTIONS = ["CCS", "CHAdeMO", "Type1", "Type2", "Tesla"];

function toRad(value: number) {
    return (value * Math.PI) / 180;
}

function haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
) {
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function StationsPage() {
    const [allStations, setAllStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCity, setSelectedCity] = useState("All Cities");
    const [selectedChargers, setSelectedChargers] = useState<string[]>([]);
    const [onlyAvailable, setOnlyAvailable] = useState(false);
    const [ratingFourPlus, setRatingFourPlus] = useState(false);
    const [nearbyOnly, setNearbyOnly] = useState(false);
    const [radiusKm, setRadiusKm] = useState("10");
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locating, setLocating] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const refreshStations = useCallback(() => {
        fetch("/api/stations")
            .then((res) => res.json())
            .then((data) => setAllStations(data.stations || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        refreshStations();
    }, [refreshStations]);

    useEffect(() => {
        const handleFocus = () => refreshStations();
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [refreshStations]);

    const cities = useMemo(() => {
        const unique = [...new Set(allStations.map((s) => s.city))].sort();
        return ["All Cities", ...unique];
    }, [allStations]);

    const toggleCharger = (c: string) => {
        setSelectedChargers((prev) =>
            prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
        );
    };

    const activeFilterCount = [
        selectedCity !== "All Cities",
        selectedChargers.length > 0,
        onlyAvailable,
        ratingFourPlus,
        nearbyOnly && userLocation !== null,
    ].filter(Boolean).length;

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedCity("All Cities");
        setSelectedChargers([]);
        setOnlyAvailable(false);
        setRatingFourPlus(false);
        setNearbyOnly(false);
        setRadiusKm("10");
    };

    const useCurrentLocation = () => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setNearbyOnly(true);
                setLocating(false);
            },
            () => setLocating(false)
        );
    };

    const stationsWithDistance = useMemo(() => {
        return allStations.map((station) => {
            const distanceKm =
                userLocation === null
                    ? null
                    : haversineKm(
                        userLocation.lat,
                        userLocation.lng,
                        station.location.latitude,
                        station.location.longitude
                    );

            return {
                station,
                distanceKm,
            };
        });
    }, [allStations, userLocation]);

    const stations = useMemo(() => {
        let list = [...stationsWithDistance];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                ({ station: s }) =>
                    s.name.toLowerCase().includes(q) ||
                    s.city.toLowerCase().includes(q) ||
                    (s.address || "").toLowerCase().includes(q)
            );
        }

        if (selectedCity !== "All Cities") {
            list = list.filter(({ station: s }) => s.city === selectedCity);
        }

        if (selectedChargers.length > 0) {
            list = list.filter(({ station: s }) => selectedChargers.includes(s.chargerType));
        }

        if (onlyAvailable) {
            list = list.filter(({ station: s }) => (s.availableNow || 0) > 0);
        }

        if (ratingFourPlus) {
            list = list.filter(({ station: s }) => s.rating >= 4);
        }

        if (nearbyOnly && userLocation) {
            const parsedRadius = Number(radiusKm);
            const effectiveRadius = Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : 10;
            list = list.filter(({ distanceKm }) => distanceKm !== null && distanceKm <= effectiveRadius);
        }

        return list;
    }, [
        stationsWithDistance,
        searchQuery,
        selectedCity,
        selectedChargers,
        onlyAvailable,
        ratingFourPlus,
        nearbyOnly,
        userLocation,
        radiusKm,
    ]);

    return (
        <div className="min-h-screen bg-slate-50">
            <section className="border-b bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-10 pt-28 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
                    <div>
                        <Badge variant="outline" className="mb-4">
                            <BatteryCharging className="mr-1 h-3.5 w-3.5" />
                            EV Charging Network
                        </Badge>
                        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Find charging stations that fit your route</h1>
                        <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            Search by city or station, then refine results by connector, availability, and proximity.
                        </p>
                    </div>
                    <div className="grid w-full max-w-md grid-cols-3 gap-3">
                        <HeaderMetric label="Stations" value={`${allStations.length}`} />
                        <HeaderMetric label="Cities" value={`${cities.length - 1}`} />
                        <HeaderMetric label="Connectors" value={`${CHARGER_OPTIONS.length}`} />
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <CardBlock>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search station name, city, or address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-12 pl-11 text-base"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5"
                                >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                        <Button
                            variant={showFilters ? "default" : "outline"}
                            className="relative h-12 gap-2 px-5"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                    </div>

                    <div className={`overflow-hidden transition-all duration-300 ${showFilters ? "mt-5 max-h-[680px] opacity-100" : "mt-0 max-h-0 opacity-0"}`}>
                        <div className="rounded-xl border bg-slate-50 p-4 sm:p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-semibold">Filter stations</span>
                                </div>
                                {activeFilterCount > 0 && (
                                    <button type="button" onClick={clearFilters} className="text-xs font-medium text-primary">
                                        Clear all
                                    </button>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <FilterField label="City">
                                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FilterField>

                                <FilterField label="Nearby Radius (km)">
                                    <Input
                                        type="number"
                                        min={1}
                                        value={radiusKm}
                                        onChange={(e) => setRadiusKm(e.target.value)}
                                        className="h-10"
                                    />
                                </FilterField>

                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 w-full gap-2"
                                        onClick={useCurrentLocation}
                                        disabled={locating}
                                    >
                                        {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                                        {userLocation ? "Refresh Location" : "Use Current Location"}
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-4">
                                <p className="mb-2 text-xs font-medium text-muted-foreground">Connector type</p>
                                <div className="flex flex-wrap gap-2">
                                    {CHARGER_OPTIONS.map((c) => {
                                        const active = selectedChargers.includes(c);
                                        return (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => toggleCharger(c)}
                                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground"}`}
                                            >
                                                <Zap className="h-3 w-3" />
                                                {c}
                                                {active ? <X className="h-3 w-3" /> : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <FilterToggle
                                    label="Show only available"
                                    checked={onlyAvailable}
                                    onChange={() => setOnlyAvailable(!onlyAvailable)}
                                />
                                <FilterToggle
                                    label="Rating 4+ only"
                                    checked={ratingFourPlus}
                                    onChange={() => setRatingFourPlus(!ratingFourPlus)}
                                />
                                <FilterToggle
                                    label={`Nearby only (${Number(radiusKm) > 0 ? radiusKm : "10"} km)`}
                                    checked={nearbyOnly}
                                    onChange={() => setNearbyOnly(!nearbyOnly)}
                                    disabled={!userLocation}
                                />
                            </div>

                            {!userLocation && (
                                <p className="mt-3 text-xs text-muted-foreground">
                                    Enable current location to use distance-based filtering.
                                </p>
                            )}
                        </div>
                    </div>
                </CardBlock>

                {!loading && (
                    <div className="mb-6 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing <span className="font-semibold text-foreground">{stations.length}</span> station{stations.length !== 1 ? "s" : ""}
                            {activeFilterCount > 0 ? <span className="text-primary"> · {activeFilterCount} active filter{activeFilterCount !== 1 ? "s" : ""}</span> : null}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Last updated just now</span>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : stations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border bg-white py-20 animate-fade-in">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl border bg-slate-50">
                            <SearchX className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mb-2 text-xl font-semibold">No stations found</h3>
                        <p className="mb-6 max-w-md text-center text-muted-foreground">
                            We could not find charging stations that match your current filters.
                        </p>
                        <Button variant="outline" onClick={clearFilters} className="gap-2">
                            <X className="h-4 w-4" />
                            Clear all filters
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {stations.map((station, index) => (
                            <StationCard
                                key={station.station._id}
                                station={station.station}
                                index={index}
                                distanceKm={station.distanceKm}
                            />
                        ))}
                    </div>
                )}
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

function CardBlock({ children }: { children: React.ReactNode }) {
    return <div className="rounded-2xl border bg-white p-4 sm:p-5">{children}</div>;
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
            {children}
        </div>
    );
}

function FilterToggle({
    label,
    checked,
    onChange,
    disabled,
}: {
    label: string;
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}) {
    return (
        <label className={`inline-flex items-center gap-2.5 rounded-lg border bg-white p-2.5 ${disabled ? "opacity-60" : ""}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-xs font-medium text-foreground">{label}</span>
        </label>
    );
}

function StationCard({
    station,
    index,
    distanceKm,
}: {
    station: Station;
    index: number;
    distanceKm: number | null;
}) {
    const available = station.availableNow || 0;
    const booked = station.occupiedNow || 0;
    const hasAvailable = available > 0;
    const total = station.totalChargingPoints || station.totalSlots || 1;
    const availPercent = (available / total) * 100;
    const statusLabel =
        station.availabilityStatus || (hasAvailable ? "Available" : "Fully Booked");

    return (
        <div
            className="animate-fade-in overflow-hidden rounded-xl border border-border bg-white transition-colors hover:border-primary/50"
            style={{ animationDelay: `${index * 60}ms` }}
        >
            <div className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold">{station.name}</h3>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{station.city}</span>
                            {distanceKm !== null ? (
                                <>
                                    <ArrowRight className="h-3 w-3" />
                                    <span className="whitespace-nowrap text-foreground">{distanceKm.toFixed(1)} km</span>
                                </>
                            ) : null}
                        </div>
                    </div>
                    <Badge
                        variant={
                            statusLabel === "Available"
                                ? "success"
                                : statusLabel === "Limited Availability"
                                    ? "warning"
                                    : "destructive"
                        }
                        className="shrink-0"
                    >
                        {statusLabel}
                    </Badge>
                </div>

                <div className="mb-4 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <Zap className="h-2.5 w-2.5" />
                        {station.chargerType}
                    </span>
                    {distanceKm !== null ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            <LocateFixed className="h-2.5 w-2.5" />
                            Nearby
                        </span>
                    ) : null}
                </div>

                <div className="mb-4 grid grid-cols-3 gap-2.5">
                    <StationMetricCell
                        label="Rating"
                        value={station.rating?.toFixed(1) || "—"}
                        icon={<Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />}
                    />
                    <StationMetricCell
                        label="Price"
                        value={`LKR ${station.pricePerKwh}`}
                        icon={<CircleDollarSign className="h-3.5 w-3.5 text-primary" />}
                    />
                    <StationMetricCell
                        label="Points"
                        value={`${total}`}
                        icon={<Gauge className="h-3.5 w-3.5 text-blue-500" />}
                    />
                </div>

                <div className="mb-4 rounded-lg border bg-muted/30 p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Availability</span>
                        <span className={`text-xs font-bold ${hasAvailable ? "text-green-600" : "text-red-600"}`}>
                            {available} available
                        </span>
                    </div>
                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${hasAvailable ? "bg-primary" : "bg-orange-400"}`}
                            style={{ width: `${availPercent}%` }}
                        />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{available} available</span>
                        <span>{booked} occupied</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Link href={`/stations/${station._id}`} className="flex-1">
                        <Button variant="outline" className="h-10 w-full gap-1.5 text-sm">
                            <Star className="h-4 w-4" />
                            View Details
                        </Button>
                    </Link>
                    <Link href={`/stations/${station._id}?book=true#booking-section`} className="flex-1">
                        <Button className="h-10 w-full gap-1.5 text-sm" disabled={!hasAvailable}>
                            <CalendarCheck className="h-4 w-4" />
                            {hasAvailable ? "Book Slot" : "Unavailable"}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function StationMetricCell({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border bg-background p-2.5 text-center">
            <div className="mb-0.5 flex items-center justify-center">{icon}</div>
            <div className="text-sm font-bold">{value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
        </div>
    );
}
