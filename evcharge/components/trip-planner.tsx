"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
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
    Search, CalendarCheck, SearchX, AlertTriangle, Map,
    Clock3, Gauge, Bot, Coins, ArrowRight, CircleDot, SlidersHorizontal,
    Plus, Trash2, ArrowUp, ArrowDown, Receipt,
} from "lucide-react";
import { formatChargingRate } from "@/lib/pricing";

const CHARGER_TYPES = ["CCS", "CHAdeMO", "Type1", "Type2", "Tesla"];
const MAX_WAYPOINTS = 3;
const DEFAULT_RANGE_KM = 250;

type SavedVehicle = {
    _id: string;
    brand?: string;
    model: string;
    rangeKm: number;
    isPrimary?: boolean;
};

interface Coordinates {
    lat: number;
    lng: number;
}

interface Waypoint {
    id: string;
    text: string;
    coords: Coordinates | null;
}

function createWaypoint(): Waypoint {
    return {
        id: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: "",
        coords: null,
    };
}

function coordsAreEqual(a: Coordinates | null, b: Coordinates | null) {
    if (!a || !b) return false;
    return Math.abs(a.lat - b.lat) < 1e-5 && Math.abs(a.lng - b.lng) < 1e-5;
}

interface AutocompletePlace {
    name: string;
    lat: number;
    lon: number;
    display_name: string;
    secondary: string;
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
    availabilityStatus: "Available" | "Limited Availability" | "Fully Booked" | "Closed";
    location: { latitude: number; longitude: number };
    distanceToRouteKm: number;
    distanceFromStartKm: number;
    estimatedWaitMinutes: number;
    estimatedChargeCostLkr: number;
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
    aiOptimization?: {
        provider: "google-gemini" | "heuristic-fallback";
        enabled: boolean;
        summary: string;
        scoreBreakdown: Array<{
            stationId: string;
            stationName: string;
            waitScore: number;
            costScore: number;
            detourScore: number;
            overallScore: number;
            reason: string;
        }>;
    };
}

const SRI_LANKA_CENTER = { lat: 7.8731, lon: 80.7718 };
const AUTOCOMPLETE_DEBOUNCE_MS = 320;
const AUTOCOMPLETE_MIN_CHARS = 2;
const AUTOCOMPLETE_MAX_RESULTS = 7;

function buildSecondary(props: Record<string, string | undefined>, mainName: string): string {
    const parts: string[] = [];
    if (props.city && props.city !== mainName) parts.push(props.city);
    if (props.county) parts.push(props.county);
    if (props.state) parts.push(props.state);
    if (props.country) parts.push(props.country);
    const unique = [...new Set(parts)];
    return unique.length > 0 ? unique.join(", ") : props.country || "";
}

async function fetchAutocompleteSuggestions(query: string): Promise<AutocompletePlace[]> {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(AUTOCOMPLETE_MAX_RESULTS + 3));
    url.searchParams.set("lang", "en");
    url.searchParams.set("lat", String(SRI_LANKA_CENTER.lat));
    url.searchParams.set("lon", String(SRI_LANKA_CENTER.lon));

    const res = await fetch(url.toString());
    if (!res.ok) return [];

    const data = await res.json();
    const features: Array<{
        geometry: { coordinates: [number, number] };
        properties: Record<string, string | undefined>;
    }> = data?.features || [];

    const results: AutocompletePlace[] = [];
    const seen = new Set<string>();

    for (const feature of features) {
        const props = feature.properties;
        const name = props.name || props.city || props.county || "";
        if (!name) continue;

        const [lon, lat] = feature.geometry.coordinates;
        const secondary = buildSecondary(props, name);
        const dedupeKey = `${name.toLowerCase()}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        results.push({
            name,
            lat,
            lon,
            display_name: secondary ? `${name}, ${secondary}` : name,
            secondary,
        });

        if (results.length >= AUTOCOMPLETE_MAX_RESULTS) break;
    }

    return results;
}

function PlaceAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder,
    resolved,
}: {
    value: string;
    onChange: (text: string) => void;
    onSelect: (place: AutocompletePlace) => void;
    placeholder: string;
    resolved: boolean;
}) {
    const [suggestions, setSuggestions] = useState<AutocompletePlace[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [noResults, setNoResults] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetchSuggestions = useCallback(async (query: string) => {
        if (query.trim().length < AUTOCOMPLETE_MIN_CHARS) {
            setSuggestions([]);
            setIsOpen(false);
            setNoResults(false);
            return;
        }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        setNoResults(false);

        try {
            const results = await fetchAutocompleteSuggestions(query);
            if (controller.signal.aborted) return;

            setSuggestions(results);
            setNoResults(results.length === 0);
            setIsOpen(true);
            setActiveIndex(-1);
        } catch {
            if (!controller.signal.aborted) {
                setSuggestions([]);
                setNoResults(true);
                setIsOpen(true);
            }
        } finally {
            if (!controller.signal.aborted) setIsLoading(false);
        }
    }, []);

    const handleInputChange = useCallback(
        (text: string) => {
            onChange(text);

            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (text.trim().length < AUTOCOMPLETE_MIN_CHARS) {
                setSuggestions([]);
                setIsOpen(false);
                setNoResults(false);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            debounceRef.current = setTimeout(() => {
                fetchSuggestions(text);
            }, AUTOCOMPLETE_DEBOUNCE_MS);
        },
        [onChange, fetchSuggestions]
    );

    const selectPlace = useCallback(
        (place: AutocompletePlace) => {
            onSelect(place);
            setSuggestions([]);
            setIsOpen(false);
            setNoResults(false);
            setActiveIndex(-1);
        },
        [onSelect]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!isOpen || suggestions.length === 0) {
                if (e.key === "Escape") {
                    setIsOpen(false);
                }
                return;
            }

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (activeIndex >= 0 && activeIndex < suggestions.length) {
                        selectPlace(suggestions[activeIndex]);
                    }
                    break;
                case "Escape":
                    e.preventDefault();
                    setIsOpen(false);
                    setActiveIndex(-1);
                    break;
            }
        },
        [isOpen, suggestions, activeIndex, selectPlace]
    );

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            abortRef.current?.abort();
        };
    }, []);

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Input
                    ref={inputRef}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0 || noResults) setIsOpen(true);
                    }}
                    className={`mt-2 h-11 pr-8 ${
                        resolved
                            ? "border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-200/60"
                            : ""
                    }`}
                    autoComplete="off"
                />
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 mt-1">
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : resolved ? (
                        <MapPin className="h-4 w-4 text-emerald-600" />
                    ) : null}
                </div>
            </div>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[320px] overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
                    {suggestions.length > 0 ? (
                        <ul role="listbox" className="py-1">
                            {suggestions.map((place, idx) => (
                                <li
                                    key={`${place.lat}-${place.lon}-${idx}`}
                                    role="option"
                                    aria-selected={idx === activeIndex}
                                    className={`flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors ${
                                        idx === activeIndex
                                            ? "bg-emerald-50 text-emerald-900"
                                            : "text-slate-800 hover:bg-slate-50"
                                    }`}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectPlace(place);
                                    }}
                                >
                                    <MapPin
                                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                                            idx === activeIndex ? "text-emerald-600" : "text-slate-400"
                                        }`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium leading-tight">
                                            {place.name}
                                        </p>
                                        {place.secondary && (
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                {place.secondary}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : noResults ? (
                        <div className="px-4 py-5 text-center">
                            <SearchX className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground" />
                            <p className="text-sm font-medium text-slate-700">
                                No matching places found
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Try a nearby area or broader location name
                            </p>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

export default function TripPlanner() {
    const { isLoaded: authLoaded, isSignedIn } = useUser();
    const [originText, setOriginText] = useState("");
    const [destinationText, setDestinationText] = useState("");
    const [originCoords, setOriginCoords] = useState<Coordinates | null>(null);
    const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null);
    const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
    const [savedVehicles, setSavedVehicles] = useState<SavedVehicle[]>([]);
    const [noPrimaryPick, setNoPrimaryPick] = useState<string | null>(null);
    const rangeEditedByUser = useRef(false);
    const [vehicleRange, setVehicleRange] = useState(String(DEFAULT_RANGE_KM));
    const [chargerType, setChargerType] = useState("any");
    const [corridorKm, setCorridorKm] = useState("7");
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [result, setResult] = useState<TripPlanResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);

    const loadSavedVehicles = useCallback(async () => {
        const res = await fetch("/api/vehicles", { credentials: "include" });
        if (!res.ok) {
            setSavedVehicles([]);
            return;
        }
        const data = await res.json();
        setSavedVehicles(data.vehicles ?? []);
    }, []);

    useEffect(() => {
        if (!authLoaded) return;
        if (!isSignedIn) {
            setSavedVehicles([]);
            setNoPrimaryPick(null);
            rangeEditedByUser.current = false;
            setVehicleRange(String(DEFAULT_RANGE_KM));
            return;
        }
        void loadSavedVehicles();
    }, [authLoaded, isSignedIn, loadSavedVehicles]);

    useEffect(() => {
        if (!isSignedIn) return;
        const onVis = () => {
            if (document.visibilityState === "visible") void loadSavedVehicles();
        };
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
    }, [isSignedIn, loadSavedVehicles]);

    const plannerContext = useMemo(() => {
        if (!authLoaded || !isSignedIn || savedVehicles.length === 0) {
            return null;
        }
        const primary = savedVehicles.find((v) => v.isPrimary);
        if (primary) {
            return { vehicle: primary, source: "primary" as const };
        }
        if (savedVehicles.length === 1) {
            return { vehicle: savedVehicles[0], source: "single-saved" as const };
        }
        const id = noPrimaryPick ?? savedVehicles[0]._id;
        const v =
            savedVehicles.find((x) => x._id === id) ?? savedVehicles[0];
        return { vehicle: v, source: "no-primary-choice" as const };
    }, [authLoaded, isSignedIn, savedVehicles, noPrimaryPick]);

    useEffect(() => {
        if (savedVehicles.length === 0) return;
        if (savedVehicles.some((v) => v.isPrimary) && noPrimaryPick !== null) {
            setNoPrimaryPick(null);
        }
    }, [savedVehicles, noPrimaryPick]);

    useEffect(() => {
        if (noPrimaryPick && !savedVehicles.some((v) => v._id === noPrimaryPick)) {
            setNoPrimaryPick(null);
        }
    }, [savedVehicles, noPrimaryPick]);

    useEffect(() => {
        if (!authLoaded) return;
        if (rangeEditedByUser.current) return;
        if (!plannerContext) {
            if (isSignedIn) {
                setVehicleRange(String(DEFAULT_RANGE_KM));
            }
            return;
        }
        setVehicleRange(String(plannerContext.vehicle.rangeKm));
    }, [plannerContext, isSignedIn, authLoaded, savedVehicles.length]);

    const addWaypoint = useCallback(() => {
        setWaypoints((current) => {
            if (current.length >= MAX_WAYPOINTS) return current;
            return [...current, createWaypoint()];
        });
    }, []);

    const removeWaypoint = useCallback((id: string) => {
        setWaypoints((current) => current.filter((wp) => wp.id !== id));
    }, []);

    const updateWaypointText = useCallback((id: string, text: string) => {
        setWaypoints((current) =>
            current.map((wp) => (wp.id === id ? { ...wp, text, coords: null } : wp))
        );
    }, []);

    const selectWaypointPlace = useCallback(
        (id: string, place: AutocompletePlace) => {
            setWaypoints((current) =>
                current.map((wp) =>
                    wp.id === id
                        ? { ...wp, text: place.display_name, coords: { lat: place.lat, lng: place.lon } }
                        : wp
                )
            );
        },
        []
    );

    const moveWaypoint = useCallback((id: string, direction: -1 | 1) => {
        setWaypoints((current) => {
            const index = current.findIndex((wp) => wp.id === id);
            if (index === -1) return current;
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= current.length) return current;
            const next = [...current];
            [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
            return next;
        });
    }, []);

    const duplicateLocationExists = useMemo(() => {
        const allCoords: Coordinates[] = [];
        if (originCoords) allCoords.push(originCoords);
        if (destinationCoords) allCoords.push(destinationCoords);
        for (const wp of waypoints) if (wp.coords) allCoords.push(wp.coords);

        for (let i = 0; i < allCoords.length; i += 1) {
            for (let j = i + 1; j < allCoords.length; j += 1) {
                if (coordsAreEqual(allCoords[i], allCoords[j])) return true;
            }
        }
        return false;
    }, [originCoords, destinationCoords, waypoints]);

    const hasEmptyWaypoint = useMemo(
        () => waypoints.some((wp) => !wp.coords),
        [waypoints]
    );

    const canSubmit =
        !loading &&
        !!originCoords &&
        !!destinationCoords &&
        !hasEmptyWaypoint &&
        !duplicateLocationExists;

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

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setHasSearched(false);
        setError(null);

        try {
            if (!originCoords || !destinationCoords) {
                setResult(null);
                setError(
                    "Please select both origin and destination from the suggestions dropdown so we can resolve their coordinates."
                );
                return;
            }

            if (hasEmptyWaypoint) {
                setResult(null);
                setError(
                    "One of your stops doesn't have a confirmed location. Pick a suggestion from the dropdown or remove the empty stop."
                );
                return;
            }

            if (duplicateLocationExists) {
                setResult(null);
                setError(
                    "Two or more locations are the same. Please make sure origin, destination and each stop are different."
                );
                return;
            }

            const res = await fetch("/api/trip-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    origin: originCoords,
                    destination: destinationCoords,
                    waypoints: waypoints
                        .map((wp) => wp.coords)
                        .filter((c): c is Coordinates => !!c),
                    vehicleRangeKm: parseInt(vehicleRange, 10) || DEFAULT_RANGE_KM,
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
    const mapWaypoints: MapPointWithLabel[] = useMemo(
        () =>
            waypoints
                .map((wp, idx) =>
                    wp.coords
                        ? {
                              lat: wp.coords.lat,
                              lng: wp.coords.lng,
                              label: wp.text || `Stop ${idx + 1}`,
                          }
                        : null
                )
                .filter((p): p is Exclude<typeof p, null> => p !== null),
        [waypoints]
    );

    const highlightedStationIds = useMemo(
        () => result?.recommendedStops.map((station) => station._id) || [],
        [result]
    );
    const hasPlannedOnce = loading || hasSearched;
    const hasRoute = !!result && !loading;

    return (
        <div className="min-h-screen bg-slate-50">
            <section
                className="relative overflow-hidden border-b bg-slate-900"
                style={{
                    backgroundImage: "url('https://qmerit.com/wp-content/uploads/2023/02/EI-SecHeader-evcharging-3jpg-scaled-1.jpeg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                <div className="absolute inset-0 bg-slate-900/65" />
                <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-10 pt-28 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
                    <div>
                        <Badge variant="outline" className="mb-4 border-white/40 bg-white/10 text-white">
                            <Route className="mr-1 h-3.5 w-3.5" />
                            Trip Planner
                        </Badge>
                        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">Plan your EV journey with confidence</h1>
                        <p className="mt-4 max-w-2xl text-sm text-white/85 sm:text-base">
                            Enter your route and charging preferences to find stations that fit your trip, budget, and timing.
                        </p>
                    </div>
                    <div className="grid w-full max-w-md grid-cols-3 gap-3">
                        <HeaderMetric label="Connector types" value={`${CHARGER_TYPES.length}`} />
                        <HeaderMetric
                            label="Planning range"
                            value={`${Math.max(1, parseInt(vehicleRange, 10) || DEFAULT_RANGE_KM)} km`}
                        />
                        <HeaderMetric label="Corridor" value={`${corridorKm} km`} />
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
                <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-5 xl:col-span-4">
                        <Card className="border bg-white lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
                            <CardContent className="p-5 sm:p-6 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-contain">
                                <div className="mb-5 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-base font-semibold text-foreground">Trip setup</p>
                                        <p className="text-xs text-muted-foreground">
                                            Fill the route details and planner filters.
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="gap-1">
                                        <SlidersHorizontal className="h-3 w-3" />
                                        Inputs
                                    </Badge>
                                </div>

                                <form onSubmit={handleSearch} className="space-y-5">
                                    <div className="rounded-xl border border-dashed p-3">
                                        <div className="flex items-start gap-2">
                                            <CircleDot className="mt-0.5 h-4 w-4 text-emerald-600" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium text-muted-foreground">Origin</p>
                                                <PlaceAutocomplete
                                                    value={originText}
                                                    placeholder="e.g. Colombo Fort"
                                                    resolved={!!originCoords}
                                                    onChange={(text) => {
                                                        setOriginText(text);
                                                        setOriginCoords(null);
                                                    }}
                                                    onSelect={(place) => {
                                                        setOriginText(place.display_name);
                                                        setOriginCoords({ lat: place.lat, lng: place.lon });
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {waypoints.length > 0 && (
                                            <div className="mt-3 space-y-2.5 border-l border-dashed border-slate-300 pl-4 ml-[7px]">
                                                {waypoints.map((wp, idx) => (
                                                    <WaypointRow
                                                        key={wp.id}
                                                        index={idx}
                                                        total={waypoints.length}
                                                        waypoint={wp}
                                                        onChange={(text) => updateWaypointText(wp.id, text)}
                                                        onSelect={(place) => selectWaypointPlace(wp.id, place)}
                                                        onRemove={() => removeWaypoint(wp.id)}
                                                        onMoveUp={() => moveWaypoint(wp.id, -1)}
                                                        onMoveDown={() => moveWaypoint(wp.id, 1)}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {waypoints.length < MAX_WAYPOINTS && (
                                            <div className="mt-3">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={addWaypoint}
                                                    className="h-8 gap-1.5 px-2 text-xs font-medium text-primary hover:bg-primary/5"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Add Stop
                                                    <span className="text-[11px] text-muted-foreground">
                                                        ({waypoints.length}/{MAX_WAYPOINTS})
                                                    </span>
                                                </Button>
                                            </div>
                                        )}

                                        <div className="my-3 ml-2 h-4 w-px bg-border" />

                                        <div className="flex items-start gap-2">
                                            <MapPin className="mt-0.5 h-4 w-4 text-rose-600" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium text-muted-foreground">Destination</p>
                                                <PlaceAutocomplete
                                                    value={destinationText}
                                                    placeholder="e.g. Kandy Clock Tower"
                                                    resolved={!!destinationCoords}
                                                    onChange={(text) => {
                                                        setDestinationText(text);
                                                        setDestinationCoords(null);
                                                    }}
                                                    onSelect={(place) => {
                                                        setDestinationText(place.display_name);
                                                        setDestinationCoords({ lat: place.lat, lng: place.lon });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {(hasEmptyWaypoint || duplicateLocationExists) && (
                                        <div className="-mt-2 rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
                                            {hasEmptyWaypoint
                                                ? "Pick a suggestion from the dropdown for each stop, or remove any empty stop."
                                                : "One or more locations are identical. Please use different places for each stop."}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                        <div className="sm:col-span-2 space-y-2">
                                            <Field
                                                label="Vehicle Range (km)"
                                                icon={<Battery className="h-3.5 w-3.5 text-primary" />}
                                            >
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    placeholder={String(DEFAULT_RANGE_KM)}
                                                    value={vehicleRange}
                                                    onChange={(e) => {
                                                        rangeEditedByUser.current = true;
                                                        setVehicleRange(e.target.value);
                                                    }}
                                                    className="h-11"
                                                />
                                            </Field>
                                            {plannerContext && (
                                                <p className="text-xs text-muted-foreground">
                                                    {plannerContext.source === "primary" && (
                                                        <>
                                                            Using primary vehicle:{" "}
                                                            <span className="font-medium text-foreground">
                                                                {plannerContext.vehicle.brand
                                                                    ? `${plannerContext.vehicle.brand} ${plannerContext.vehicle.model}`
                                                                    : plannerContext.vehicle.model}{" "}
                                                                ({plannerContext.vehicle.rangeKm} km)
                                                            </span>
                                                        </>
                                                    )}
                                                    {plannerContext.source === "single-saved" && (
                                                        <>
                                                            No primary set — using your saved vehicle:{" "}
                                                            <span className="font-medium text-foreground">
                                                                {plannerContext.vehicle.brand
                                                                    ? `${plannerContext.vehicle.brand} ${plannerContext.vehicle.model}`
                                                                    : plannerContext.vehicle.model}{" "}
                                                                ({plannerContext.vehicle.rangeKm} km)
                                                            </span>
                                                            .{" "}
                                                            <Link
                                                                href="/dashboard/vehicles"
                                                                className="text-primary underline-offset-2 hover:underline"
                                                            >
                                                                Set a primary
                                                            </Link>
                                                        </>
                                                    )}
                                                    {plannerContext.source === "no-primary-choice" && (
                                                        <>
                                                            No primary — choose a saved vehicle for this trip or{" "}
                                                            <Link
                                                                href="/dashboard/vehicles"
                                                                className="text-primary underline-offset-2 hover:underline"
                                                            >
                                                                set a primary
                                                            </Link>
                                                            .
                                                        </>
                                                    )}
                                                </p>
                                            )}
                                            {authLoaded &&
                                                isSignedIn &&
                                                savedVehicles.length > 0 &&
                                                !savedVehicles.some((v) => v.isPrimary) &&
                                                savedVehicles.length > 1 && (
                                                    <div className="pt-0.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            Vehicle for this trip
                                                        </Label>
                                                        <Select
                                                            value={noPrimaryPick ?? savedVehicles[0]?._id}
                                                            onValueChange={(v) => {
                                                                rangeEditedByUser.current = false;
                                                                setNoPrimaryPick(v);
                                                                const pick = savedVehicles.find((x) => x._id === v);
                                                                if (pick) setVehicleRange(String(pick.rangeKm));
                                                            }}
                                                        >
                                                            <SelectTrigger className="mt-1.5 h-9 text-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {savedVehicles.map((v) => (
                                                                    <SelectItem key={v._id} value={v._id}>
                                                                        {v.brand ? `${v.brand} ${v.model}` : v.model} (
                                                                        {v.rangeKm} km)
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            {authLoaded && isSignedIn && savedVehicles.length === 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    No saved vehicle — using default {DEFAULT_RANGE_KM} km.{" "}
                                                    <Link
                                                        href="/dashboard/vehicles"
                                                        className="text-primary underline-offset-2 hover:underline"
                                                    >
                                                        Add a vehicle
                                                    </Link>{" "}
                                                    for a personalized default.
                                                </p>
                                            )}
                                        </div>

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

                                    <div className="flex flex-wrap gap-2">
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

                                    <Button type="submit" className="h-12 w-full gap-2 text-base font-semibold" disabled={!canSubmit}>
                                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                        {loading ? "Planning your route..." : "Plan EV Trip"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6 lg:col-span-7 xl:col-span-8">
                        <Card className="relative isolate overflow-hidden border bg-white">
                            <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
                                <div className="flex items-center gap-2">
                                    <Route className="h-4 w-4 text-primary" />
                                    <p className="text-sm font-medium">Route preview</p>
                                </div>
                                <Badge variant={hasRoute ? "secondary" : "outline"}>
                                    {hasRoute ? "Route ready" : "Waiting for input"}
                                </Badge>
                            </div>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="flex h-[420px] items-center justify-center bg-muted/20">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    </div>
                                ) : result ? (
                                    <MapView
                                        className="h-[420px]"
                                        stations={result.stationsOnRoute}
                                        routePath={result.route.routePath}
                                        origin={mapOrigin}
                                        destination={mapDestination}
                                        waypoints={mapWaypoints}
                                        highlightedStationIds={highlightedStationIds}
                                    />
                                ) : (
                                    <div className="flex h-[420px] flex-col items-center justify-center bg-muted/20 px-6 text-center">
                                        <div className="mb-4 rounded-xl border bg-background p-3">
                                            <Route className="h-8 w-8 text-primary" />
                                        </div>
                                        <p className="text-lg font-semibold">Your route preview appears here</p>
                                        <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                            Add origin and destination details, then start planning to see route-aware charging stations.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {!hasPlannedOnce && (
                            <Card className="border bg-white">
                                <CardContent className="p-5">
                                    <p className="text-sm font-semibold text-foreground">How this planner works</p>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                        <PlannerStep icon={<MapPin className="h-4 w-4 text-primary" />} title="Define route" description="Set origin and destination for your trip." />
                                        <PlannerStep icon={<Gauge className="h-4 w-4 text-primary" />} title="Set constraints" description="Add battery range and corridor preferences." />
                                        <PlannerStep icon={<CalendarCheck className="h-4 w-4 text-primary" />} title="Choose stop" description="Compare stations and pre-book your slot." />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

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

                                        <div className={`rounded-xl border p-4 ${result.safety.canReachDestination ? "border-primary/40 bg-primary/5" : "border-orange-300 bg-orange-50/60"}`}>
                                            <p className="text-sm font-semibold">
                                                {result.safety.canReachDestination ? "Trip is feasible with this plan" : "Trip may not be guaranteed"}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">{result.safety.note}</p>
                                        </div>

                                        {result.aiOptimization && (
                                            <div className={`rounded-xl border p-4 ${result.aiOptimization.enabled ? "border-blue-300 bg-blue-50/60" : "border-slate-300 bg-slate-50"}`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="flex items-center gap-2 text-sm font-semibold">
                                                        <Bot className="h-4 w-4 text-blue-600" />
                                                        Route optimization
                                                    </p>
                                                    <Badge variant={result.aiOptimization.enabled ? "secondary" : "outline"}>
                                                        {result.aiOptimization.enabled ? "Google Gemini" : "Heuristic Fallback"}
                                                    </Badge>
                                                </div>
                                                <p className="mt-2 text-sm text-muted-foreground">{result.aiOptimization.summary}</p>
                                            </div>
                                        )}

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

function HeaderMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
        </div>
    );
}

function PlannerStep({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
    return (
        <div className="rounded-xl border bg-slate-50 p-3">
            <div className="flex items-center gap-2">
                {icon}
                <p className="text-sm font-semibold text-foreground">{title}</p>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
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
        ? "border-primary/20 bg-primary/5"
        : tone === "blue"
            ? "border-blue-200 bg-blue-50/70"
            : tone === "emerald"
                ? "border-emerald-200 bg-emerald-50/70"
                : "border-slate-200 bg-slate-100/70";

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
            className="animate-fade-in overflow-hidden rounded-xl border border-border bg-white transition-colors hover:border-primary/50"
            style={{ animationDelay: `${index * 80}ms` }}
        >
            <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold">{station.name}</h3>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{station.city}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="whitespace-nowrap font-medium text-foreground">{station.distanceFromStartKm.toFixed(1)} km</span>
                        </div>
                    </div>
                    <Badge
                        variant={station.availabilityStatus === "Available" ? "success" : station.availabilityStatus === "Limited Availability" ? "warning" : "destructive"}
                        className="shrink-0"
                    >
                        {station.availabilityStatus}
                    </Badge>
                </div>

                <div className="mb-4 flex flex-wrap gap-1.5">
                    {station.chargerType.split(",").map((t: string) => t.trim()).filter(Boolean).map((type: string) => (
                        <span key={type} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            <Zap className="h-2.5 w-2.5" /> {type}
                        </span>
                    ))}
                    <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        <Map className="h-2.5 w-2.5" /> {station.distanceToRouteKm.toFixed(1)} km off route
                    </span>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MetricCell
                        label="Charging Rate"
                        value={formatChargingRate(station.pricePerKwh)}
                        icon={<Receipt className="h-3 w-3 text-primary" />}
                    />
                    <MetricCell
                        label="Rating"
                        value={station.rating?.toFixed(1) || "—"}
                        icon={<Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                    />
                    <MetricCell label="Available" value={`${station.availableNow}/${station.totalChargingPoints}`} subLabel="points" />
                    <MetricCell label="Wait" value={`${station.estimatedWaitMinutes} min`} icon={<Clock3 className="h-3 w-3" />} />
                </div>

                <div className="mb-4 rounded-lg border bg-muted/30 p-3">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Coins className="h-3 w-3" />
                        Estimated charging cost (paid at station)
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">LKR {station.estimatedChargeCostLkr}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                        Estimate based on the station&apos;s charging rate. Online booking only charges a small reservation fee.
                    </p>
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

function WaypointRow({
    index,
    total,
    waypoint,
    onChange,
    onSelect,
    onRemove,
    onMoveUp,
    onMoveDown,
}: {
    index: number;
    total: number;
    waypoint: Waypoint;
    onChange: (text: string) => void;
    onSelect: (place: AutocompletePlace) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}) {
    return (
        <div className="relative">
            <div className="flex items-start gap-2">
                <div className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700 ring-2 ring-white">
                    {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                            Stop {index + 1}
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground/80">
                                (optional)
                            </span>
                        </p>
                        <div className="flex items-center gap-0.5">
                            <button
                                type="button"
                                onClick={onMoveUp}
                                disabled={index === 0}
                                aria-label="Move stop up"
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={onMoveDown}
                                disabled={index === total - 1}
                                aria-label="Move stop down"
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={onRemove}
                                aria-label="Remove stop"
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                    <PlaceAutocomplete
                        value={waypoint.text}
                        placeholder={`e.g. waypoint ${index + 1} location`}
                        resolved={!!waypoint.coords}
                        onChange={onChange}
                        onSelect={onSelect}
                    />
                </div>
            </div>
        </div>
    );
}

function MetricCell({
    label,
    value,
    subLabel,
    icon,
}: {
    label: string;
    value: string;
    subLabel?: string;
    icon?: ReactNode;
}) {
    return (
        <div className="rounded-lg border bg-background p-2.5 text-center">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-0.5 flex items-center justify-center gap-1 text-sm font-bold text-foreground">
                {icon}
                <span>{value}</span>
            </div>
            {subLabel ? <div className="text-[10px] text-muted-foreground">{subLabel}</div> : null}
        </div>
    );
}
