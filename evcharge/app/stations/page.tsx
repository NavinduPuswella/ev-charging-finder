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
    Loader2, BatteryCharging, SearchX, Navigation, LocateFixed,
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
        <div className="min-h-screen bg-white">
            <section className="border-b border-border bg-muted/30">
                <div className="mx-auto max-w-7xl px-4 pt-28 pb-8 sm:px-6 lg:px-8">
                    <div className="mb-8 flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-primary mb-1">
                            <BatteryCharging className="h-5 w-5" />
                            <span className="text-sm font-semibold tracking-wide uppercase">EV Charging Network</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Find EV Charging Stations
                        </h1>
                        <p className="text-muted-foreground mt-1 max-w-xl">
                            Discover, compare and book charging points at stations across Sri Lanka
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by station name, city or address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-12 pl-11 text-base rounded-lg bg-white"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full cursor-pointer">
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant={showFilters ? "default" : "outline"} className="h-12 gap-2 rounded-lg px-5 relative" onClick={() => setShowFilters(!showFilters)}>
                                <SlidersHorizontal className="h-4 w-4" />
                                <span className="hidden sm:inline">Filters</span>
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{activeFilterCount}</span>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? "max-h-[500px] opacity-100 mt-5" : "max-h-0 opacity-0 mt-0"}`}>
                        <div className="rounded-xl border border-border bg-white p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-primary" />
                                    <span className="font-semibold text-sm">Filter Stations</span>
                                </div>
                                {activeFilterCount > 0 && (
                                    <button onClick={clearFilters} className="text-xs text-primary font-medium cursor-pointer">Clear all filters</button>
                                )}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">City</label>
                                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                                        <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nearby Radius (km)</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={radiusKm}
                                        onChange={(e) => setRadiusKm(e.target.value)}
                                        className="h-10 rounded-lg"
                                    />
                                </div>
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
                                <label className="text-xs font-medium text-muted-foreground mb-2 block">Charger Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {CHARGER_OPTIONS.map((c) => {
                                        const active = selectedChargers.includes(c);
                                        return (
                                            <button key={c} onClick={() => toggleCharger(c)}
                                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground"}`}>
                                                <Zap className="h-3 w-3" />{c}{active && <X className="h-3 w-3 ml-0.5" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-4">
                                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" checked={onlyAvailable} onChange={() => setOnlyAvailable(!onlyAvailable)} className="peer sr-only" />
                                        <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary" />
                                        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">Show only available</span>
                                </label>
                                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" checked={ratingFourPlus} onChange={() => setRatingFourPlus(!ratingFourPlus)} className="peer sr-only" />
                                        <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary" />
                                        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">Rating 4+ only</span>
                                </label>
                                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={nearbyOnly}
                                            onChange={() => setNearbyOnly(!nearbyOnly)}
                                            disabled={!userLocation}
                                            className="peer sr-only"
                                        />
                                        <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary" />
                                        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">
                                        Nearby only ({Number(radiusKm) > 0 ? radiusKm : "10"} km)
                                    </span>
                                </label>
                            </div>
                            {!userLocation && (
                                <p className="mt-3 text-xs text-muted-foreground">
                                    Enable current location to filter by nearby distance.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {!loading && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                        <p className="text-sm text-muted-foreground">
                            Showing <span className="font-semibold text-foreground">{stations.length}</span> station{stations.length !== 1 ? "s" : ""}
                            {activeFilterCount > 0 && <span className="text-primary"> · {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active</span>}
                        </p>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /><span>Last updated just now</span>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : stations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted mb-4">
                            <SearchX className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No stations found</h3>
                        <p className="text-muted-foreground text-center max-w-md mb-6">
                            We couldn&apos;t find any charging stations matching your criteria.
                        </p>
                        <Button variant="outline" onClick={clearFilters} className="gap-2">
                            <X className="h-4 w-4" />Clear all filters
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            className="rounded-xl border border-border bg-white overflow-hidden animate-fade-in"
            style={{ animationDelay: `${index * 60}ms` }}
        >
            <div className={`h-1 ${hasAvailable ? "bg-primary" : "bg-orange-400"}`} />

            <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{station.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{station.city}</span>
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
                        className="shrink-0 ml-2"
                    >
                        {statusLabel}
                    </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <Zap className="h-2.5 w-2.5" />{station.chargerType}
                    </span>
                    {distanceKm !== null && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            <LocateFixed className="h-2.5 w-2.5" />
                            {distanceKm.toFixed(1)} km away
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-2.5 mb-4">
                    <div className="flex flex-col items-center rounded-lg bg-amber-50 border border-amber-100 p-2.5">
                        <Star className="h-4 w-4 text-amber-500 mb-0.5 fill-amber-500" />
                        <span className="text-sm font-bold">{station.rating?.toFixed(1) || "—"}</span>
                        <span className="text-[10px] text-muted-foreground">rating</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg bg-green-50 border border-green-100 p-2.5">
                        <CircleDollarSign className="h-4 w-4 text-primary mb-0.5" />
                        <span className="text-sm font-bold">LKR {station.pricePerKwh}</span>
                        <span className="text-[10px] text-muted-foreground">per kWh</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                        <Gauge className="h-4 w-4 text-blue-500 mb-0.5" />
                        <span className="text-sm font-bold">{total}</span>
                        <span className="text-[10px] text-muted-foreground">points</span>
                    </div>
                </div>

                <div className="rounded-lg bg-muted/40 border border-border p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-foreground">Availability</span>
                        <span className={`text-xs font-bold ${hasAvailable ? "text-green-600" : "text-red-600"}`}>
                            Available: {available}
                        </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${hasAvailable ? "bg-primary" : "bg-orange-400"}`}
                            style={{ width: `${availPercent}%` }}
                        />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />{available} available</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" />{booked} occupied</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Link href={`/stations/${station._id}`} className="flex-1">
                        <Button variant="outline" className="w-full h-10 text-sm gap-1.5">
                            <Star className="h-4 w-4" />View Details
                        </Button>
                    </Link>
                    <Link href={`/stations/${station._id}?book=true#booking-section`} className="flex-1">
                        <Button className={`w-full h-10 text-sm gap-1.5 ${!hasAvailable ? "opacity-50 cursor-not-allowed" : ""}`} disabled={!hasAvailable}>
                            <CalendarCheck className="h-4 w-4" />Book Slot
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
