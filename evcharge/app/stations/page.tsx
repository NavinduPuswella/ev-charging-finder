"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import MapView from "@/components/map-view";
import {
    Search, MapPin, Zap, Star, Clock, Filter, List, Map,
    SlidersHorizontal, X, Gauge, CircleDollarSign, CalendarCheck,
    Loader2, BatteryCharging, SearchX,
} from "lucide-react";

/* ───────────────────────── Types ───────────────────────── */

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

/* ───────────────────── Component ───────────────────────── */

export default function StationsPage() {
    const [allStations, setAllStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCity, setSelectedCity] = useState("All Cities");
    const [selectedChargers, setSelectedChargers] = useState<string[]>([]);
    const [onlyAvailable, setOnlyAvailable] = useState(false);
    const [ratingFourPlus, setRatingFourPlus] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const refreshStations = useCallback(() => {
        fetch("/api/stations")
            .then((res) => res.json())
            .then((data) => setAllStations(data.stations || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Fetch on mount
    useEffect(() => {
        refreshStations();
    }, [refreshStations]);

    // Re-fetch when the tab/window regains focus (e.g. user returns from booking)
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
    ].filter(Boolean).length;

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedCity("All Cities");
        setSelectedChargers([]);
        setOnlyAvailable(false);
        setRatingFourPlus(false);
    };

    const stations = useMemo(() => {
        let list = [...allStations];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (s) =>
                    s.name.toLowerCase().includes(q) ||
                    s.city.toLowerCase().includes(q) ||
                    (s.address || "").toLowerCase().includes(q)
            );
        }

        if (selectedCity !== "All Cities") {
            list = list.filter((s) => s.city === selectedCity);
        }

        if (selectedChargers.length > 0) {
            list = list.filter((s) => selectedChargers.includes(s.chargerType));
        }

        if (onlyAvailable) {
            list = list.filter((s) => (s.availableNow || 0) > 0);
        }

        if (ratingFourPlus) {
            list = list.filter((s) => s.rating >= 4);
        }

        return list;
    }, [allStations, searchQuery, selectedCity, selectedChargers, onlyAvailable, ratingFourPlus]);

    const mapStations = useMemo(() => stations.map(s => ({
        _id: s._id,
        name: s.name,
        city: s.city,
        area: s.city,
        chargerTypes: [s.chargerType],
        pricePerKwh: s.pricePerKwh,
        rating: s.rating,
        reviewCount: 0,
        slots: {
            total: s.totalChargingPoints || s.totalSlots,
            available: s.availableNow || 0,
            booked: s.occupiedNow || 0,
            nextAvailable: "—",
        },
        distanceKm: 0,
        location: s.location,
        isOpen: true,
    })), [stations]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50/60 via-white to-white">
            {/* Hero Header */}
            <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-[hsl(142,71%,35%)]/8 via-white to-green-50/80">
                <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-green-400/8 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-4 pt-28 pb-8 sm:px-6 lg:px-8">
                    <div className="mb-8 flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-primary mb-1">
                            <BatteryCharging className="h-5 w-5" />
                            <span className="text-sm font-semibold tracking-wide uppercase">EV Charging Network</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Find EV Charging{" "}
                            <span className="bg-gradient-to-r from-primary to-green-500 bg-clip-text text-transparent">Stations</span>
                        </h1>
                        <p className="text-muted-foreground mt-1 max-w-xl">
                            Discover, compare and book charging points at stations across Sri Lanka
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                            <Input
                                placeholder="Search by station name, city or address…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-12 pl-11 text-base rounded-xl border-border/70 bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors cursor-pointer">
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant={showFilters ? "default" : "outline"} className="h-12 gap-2 rounded-xl px-5 relative" onClick={() => setShowFilters(!showFilters)}>
                                <SlidersHorizontal className="h-4 w-4" />
                                <span className="hidden sm:inline">Filters</span>
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">{activeFilterCount}</span>
                                )}
                            </Button>
                            <div className="flex rounded-xl border border-border/70 overflow-hidden bg-white/80 backdrop-blur-sm shadow-sm">
                                <button onClick={() => setShowMap(false)} className={`flex items-center gap-1.5 px-4 h-12 text-sm font-medium transition-colors cursor-pointer ${!showMap ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                                    <List className="h-4 w-4" /><span className="hidden sm:inline">List</span>
                                </button>
                                <button onClick={() => setShowMap(true)} className={`flex items-center gap-1.5 px-4 h-12 text-sm font-medium transition-colors cursor-pointer ${showMap ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                                    <Map className="h-4 w-4" /><span className="hidden sm:inline">Map + List</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filters Panel */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? "max-h-[500px] opacity-100 mt-5" : "max-h-0 opacity-0 mt-0"}`}>
                        <div className="rounded-2xl border border-border/60 bg-white/90 backdrop-blur-md p-5 shadow-lg shadow-black/[0.03]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-primary" />
                                    <span className="font-semibold text-sm">Filter Stations</span>
                                </div>
                                {activeFilterCount > 0 && (
                                    <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium cursor-pointer">Clear all filters</button>
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
                            </div>
                            <div className="mt-4">
                                <label className="text-xs font-medium text-muted-foreground mb-2 block">Charger Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {CHARGER_OPTIONS.map((c) => {
                                        const active = selectedChargers.includes(c);
                                        return (
                                            <button key={c} onClick={() => toggleCharger(c)}
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-primary/5"}`}>
                                                <Zap className="h-3 w-3" />{c}{active && <X className="h-3 w-3 ml-0.5" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-4">
                                <label className="inline-flex items-center gap-2.5 cursor-pointer group">
                                    <div className="relative">
                                        <input type="checkbox" checked={onlyAvailable} onChange={() => setOnlyAvailable(!onlyAvailable)} className="peer sr-only" />
                                        <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary" />
                                        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Show only available</span>
                                </label>
                                <label className="inline-flex items-center gap-2.5 cursor-pointer group">
                                    <div className="relative">
                                        <input type="checkbox" checked={ratingFourPlus} onChange={() => setRatingFourPlus(!ratingFourPlus)} className="peer sr-only" />
                                        <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary" />
                                        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Rating 4+ only</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content Area */}
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {showMap && !loading && (
                    <div className="mb-8 animate-fade-in">
                        <MapView stations={mapStations} className="h-[400px] rounded-2xl shadow-md" />
                    </div>
                )}

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
                        <div className="relative mb-6">
                            <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-150" />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-green-100 border border-border/50">
                                <SearchX className="h-9 w-9 text-primary/60" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No stations found</h3>
                        <p className="text-muted-foreground text-center max-w-md mb-6">
                            We couldn&apos;t find any charging stations matching your criteria.
                        </p>
                        <Button variant="outline" onClick={clearFilters} className="gap-2 rounded-xl">
                            <X className="h-4 w-4" />Clear all filters
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {stations.map((station, index) => (
                            <StationCard key={station._id} station={station} index={index} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ────────────────── Station Card ──────────────────────── */

function StationCard({ station, index }: { station: Station; index: number }) {
    const available = station.availableNow || 0;
    const booked = station.occupiedNow || 0;
    const hasAvailable = available > 0;
    const total = station.totalChargingPoints || station.totalSlots || 1;
    const availPercent = (available / total) * 100;
    const statusLabel =
        station.availabilityStatus || (hasAvailable ? "Available" : "Fully Booked");

    return (
        <div
            className="group rounded-2xl border border-border/50 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 animate-fade-in"
            style={{ animationDelay: `${index * 60}ms` }}
        >
            <div className={`h-1.5 transition-all duration-300 ${hasAvailable ? "bg-gradient-to-r from-green-400 via-emerald-400 to-green-500" : "bg-gradient-to-r from-orange-300 via-amber-400 to-orange-400"}`} />

            <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">{station.name}</h3>
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
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/15">
                        <Zap className="h-2.5 w-2.5" />{station.chargerType}
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 mb-4">
                    <div className="flex flex-col items-center rounded-xl bg-gradient-to-b from-amber-50 to-amber-50/50 border border-amber-100/60 p-2.5">
                        <Star className="h-4 w-4 text-amber-500 mb-0.5 fill-amber-500" />
                        <span className="text-sm font-bold">{station.rating?.toFixed(1) || "—"}</span>
                        <span className="text-[10px] text-muted-foreground">rating</span>
                    </div>
                    <div className="flex flex-col items-center rounded-xl bg-gradient-to-b from-green-50 to-green-50/50 border border-green-100/60 p-2.5">
                        <CircleDollarSign className="h-4 w-4 text-primary mb-0.5" />
                        <span className="text-sm font-bold">LKR {station.pricePerKwh} / kWh</span>
                        <span className="text-[10px] text-muted-foreground">per kWh</span>
                    </div>
                    <div className="flex flex-col items-center rounded-xl bg-gradient-to-b from-blue-50 to-blue-50/50 border border-blue-100/60 p-2.5">
                        <Gauge className="h-4 w-4 text-blue-500 mb-0.5" />
                        <span className="text-sm font-bold">{total}</span>
                        <span className="text-[10px] text-muted-foreground">charging points</span>
                    </div>
                </div>

                <div className="rounded-xl bg-muted/40 border border-border/40 p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-foreground">Charging Point Availability</span>
                        <span className={`text-xs font-bold ${hasAvailable ? "text-green-600" : "text-red-600"}`}>
                            Available Now: {available}
                        </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${hasAvailable ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-gradient-to-r from-amber-400 to-orange-400"}`}
                            style={{ width: `${availPercent}%` }}
                        />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-400" />{available} available</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" />{booked} occupied</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Link href={`/stations/${station._id}`} className="flex-1">
                        <Button variant="outline" className="w-full rounded-xl h-10 text-sm gap-1.5">
                            <Star className="h-4 w-4" />View Details
                        </Button>
                    </Link>
                    <Link href={`/stations/${station._id}?book=true#booking-section`} className="flex-1">
                        <Button className={`w-full rounded-xl h-10 text-sm gap-1.5 ${!hasAvailable ? "opacity-50 cursor-not-allowed" : ""}`} disabled={!hasAvailable}>
                            <CalendarCheck className="h-4 w-4" />Book Slot
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
