"use client";

import {
    KeyboardEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import L from "leaflet";
import {
    MapContainer,
    Marker,
    TileLayer,
    useMap,
    useMapEvents,
} from "react-leaflet";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LocationMapPickerProps {
    latitude: string;
    longitude: string;
    onCoordinatesChange: (latitude: string, longitude: string) => void;
    onUseDetectedAddress?: (detected: { city?: string; address: string }) => void;
    className?: string;
    mapClassName?: string;
}

interface NominatimSearchResult {
    lat: string;
    lon: string;
    display_name: string;
    address?: {
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        county?: string;
        state?: string;
    };
}

interface NominatimReverseResult {
    display_name?: string;
    address?: NominatimSearchResult["address"];
}

interface LocationSuggestion {
    id: string;
    lat: number;
    lng: number;
    displayName: string;
    city?: string;
    distanceKm?: number;
}

const DEFAULT_CENTER: [number, number] = [7.8731, 80.7718];
const DEFAULT_ZOOM = 7;
const SELECTED_ZOOM = 16;
const SEARCH_LIMIT = 6;
const AUTOCOMPLETE_LIMIT = 8;
const AUTOCOMPLETE_MIN_CHARS = 2;
const AUTOCOMPLETE_DEBOUNCE_MS = 400;
const VIEWBOX_HALF_SPAN_DEG = 0.35;

const pickerIcon = new L.DivIcon({
    html: '<div style="position:relative;width:28px;height:28px;border-radius:999px;background:#16a34a;border:3px solid white;box-shadow:0 8px 18px rgba(22,163,74,.35);"><div style="position:absolute;left:50%;bottom:-9px;width:12px;height:12px;background:#16a34a;border-right:3px solid white;border-bottom:3px solid white;transform:translateX(-50%) rotate(45deg);"></div></div>',
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
});

function isValidLatitude(value: number) {
    return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number) {
    return Number.isFinite(value) && value >= -180 && value <= 180;
}

function formatCoordinate(value: number) {
    return value.toFixed(6);
}

function getDistanceKm(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
) {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(toLat - fromLat);
    const dLng = toRadians(toLng - fromLng);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(fromLat)) *
            Math.cos(toRadians(toLat)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
}

function buildViewboxFromAnchor(lat: number, lng: number) {
    const d = VIEWBOX_HALF_SPAN_DEG;
    const minLon = lng - d;
    const maxLon = lng + d;
    const minLat = lat - d;
    const maxLat = lat + d;
    return `${minLon},${maxLat},${maxLon},${minLat}`;
}

function getCity(result?: { address?: NominatimSearchResult["address"] }) {
    return (
        result?.address?.city ||
        result?.address?.town ||
        result?.address?.village ||
        result?.address?.suburb ||
        result?.address?.county ||
        result?.address?.state
    );
}

function SyncMapView({ position }: { position: [number, number] | null }) {
    const map = useMap();

    useEffect(() => {
        if (position) {
            map.setView(position, SELECTED_ZOOM);
        }
    }, [map, position]);

    return null;
}

function MapClickHandler({
    onPick,
}: {
    onPick: (latitude: number, longitude: number) => void;
}) {
    useMapEvents({
        click(event) {
            onPick(event.latlng.lat, event.latlng.lng);
        },
    });

    return null;
}

export default function LocationMapPicker({
    latitude,
    longitude,
    onCoordinatesChange,
    onUseDetectedAddress,
    className = "",
    mapClassName = "h-[260px]",
}: LocationMapPickerProps) {
    const [query, setQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [reverseLoading, setReverseLoading] = useState(false);
    const [detectedAddress, setDetectedAddress] = useState<{
        city?: string;
        address: string;
    } | null>(null);
    const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
    const [autocompleteOpen, setAutocompleteOpen] = useState(false);
    const [autocompleteLoading, setAutocompleteLoading] = useState(false);
    const [autocompleteItems, setAutocompleteItems] = useState<LocationSuggestion[]>([]);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const position = useMemo<[number, number] | null>(() => {
        const lat = Number(latitude);
        const lng = Number(longitude);

        if (!isValidLatitude(lat) || !isValidLongitude(lng)) return null;
        return [lat, lng];
    }, [latitude, longitude]);

    const setCoordinates = useCallback((lat: number, lng: number) => {
        onCoordinatesChange(formatCoordinate(lat), formatCoordinate(lng));
    }, [onCoordinatesChange]);

    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        if (!onUseDetectedAddress) return;

        setReverseLoading(true);
        try {
            const params = new URLSearchParams({
                format: "jsonv2",
                lat: String(lat),
                lon: String(lng),
                addressdetails: "1",
            });
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
            if (!res.ok) throw new Error("Reverse geocoding failed");

            const data = (await res.json()) as NominatimReverseResult;
            if (data.display_name) {
                setDetectedAddress({
                    city: getCity(data),
                    address: data.display_name,
                });
            }
        } catch {
            setDetectedAddress(null);
        } finally {
            setReverseLoading(false);
        }
    }, [onUseDetectedAddress]);

    const pickLocation = useCallback((lat: number, lng: number) => {
        setCoordinates(lat, lng);
        void reverseGeocode(lat, lng);
    }, [reverseGeocode, setCoordinates]);

    const rankSearchResults = useCallback(
        (results: NominatimSearchResult[], anchor: [number, number] | null) => {
            return results
                .map((result, index) => {
                    const lat = Number(result.lat);
                    const lng = Number(result.lon);
                    if (!isValidLatitude(lat) || !isValidLongitude(lng)) return null;

                    const distanceKm = anchor
                        ? getDistanceKm(anchor[0], anchor[1], lat, lng)
                        : undefined;

                    return {
                        id: `${lat},${lng}-${index}`,
                        lat,
                        lng,
                        displayName: result.display_name,
                        city: getCity(result),
                        distanceKm,
                    } satisfies LocationSuggestion;
                })
                .filter((item): item is Exclude<typeof item, null> => item !== null)
                .sort((a, b) => {
                    if (a.distanceKm == null && b.distanceKm == null) return 0;
                    if (a.distanceKm == null) return 1;
                    if (b.distanceKm == null) return -1;
                    return a.distanceKm - b.distanceKm;
                });
        },
        []
    );

    const fetchRankedSuggestions = useCallback(
        async (
            trimmedQuery: string,
            anchor: [number, number] | null,
            limit: number,
            signal?: AbortSignal
        ): Promise<LocationSuggestion[]> => {
            const params = new URLSearchParams({
                format: "jsonv2",
                q: trimmedQuery,
                limit: String(limit),
                addressdetails: "1",
            });
            if (anchor) {
                params.set("viewbox", buildViewboxFromAnchor(anchor[0], anchor[1]));
            }

            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?${params}`,
                { signal }
            );
            if (!res.ok) throw new Error("Location search failed");

            const results = (await res.json()) as NominatimSearchResult[];
            return rankSearchResults(results, anchor);
        },
        [rankSearchResults]
    );

    const searchLocation = async () => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            toast.error("Enter a location to search.");
            return;
        }

        setSearching(true);
        setAutocompleteOpen(false);
        try {
            const parsedSuggestions = await fetchRankedSuggestions(
                trimmedQuery,
                position,
                SEARCH_LIMIT
            );

            const bestMatch = parsedSuggestions[0];
            if (!bestMatch) {
                toast.error("No matching location found.");
                setSuggestions([]);
                return;
            }

            setCoordinates(bestMatch.lat, bestMatch.lng);
            setDetectedAddress({
                city: bestMatch.city,
                address: bestMatch.displayName,
            });
            setSuggestions(parsedSuggestions);
            toast.success("Location found. Drag the pin if needed.");
        } catch {
            toast.error("Couldn't search that location. Please try again.");
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < AUTOCOMPLETE_MIN_CHARS) {
            setAutocompleteItems([]);
            setAutocompleteLoading(false);
            setHighlightIndex(-1);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => {
            setAutocompleteLoading(true);
            void (async () => {
                try {
                    const ranked = await fetchRankedSuggestions(
                        trimmed,
                        position,
                        AUTOCOMPLETE_LIMIT,
                        controller.signal
                    );
                    if (controller.signal.aborted) return;
                    setAutocompleteItems(ranked);
                    setHighlightIndex(ranked.length > 0 ? 0 : -1);
                } catch {
                    if (controller.signal.aborted) return;
                    setAutocompleteItems([]);
                    setHighlightIndex(-1);
                } finally {
                    if (!controller.signal.aborted) setAutocompleteLoading(false);
                }
            })();
        }, AUTOCOMPLETE_DEBOUNCE_MS);

        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [query, position, fetchRankedSuggestions]);

    useEffect(() => {
        return () => {
            if (blurCloseTimer.current) clearTimeout(blurCloseTimer.current);
        };
    }, []);

    const applySuggestion = useCallback(
        (item: LocationSuggestion, options?: { closeDropdown?: boolean }) => {
            const close = options?.closeDropdown !== false;
            pickLocation(item.lat, item.lng);
            setDetectedAddress({
                city: item.city,
                address: item.displayName,
            });
            setSuggestions(
                autocompleteItems.length > 0 ? autocompleteItems : [item]
            );
            const primary = item.displayName.split(",")[0]?.trim() || item.displayName;
            setQuery(primary);
            if (close) {
                setAutocompleteOpen(false);
                setHighlightIndex(-1);
            }
        },
        [autocompleteItems, pickLocation]
    );

    const markerHandlers = useMemo(
        () => ({
            dragend(event: L.LeafletEvent) {
                const marker = event.target as L.Marker;
                const nextPosition = marker.getLatLng();
                pickLocation(nextPosition.lat, nextPosition.lng);
            },
        }),
        [pickLocation]
    );

    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        const items = autocompleteItems;
        const open = autocompleteOpen && items.length > 0;

        if (event.key === "Escape") {
            if (open || autocompleteLoading) {
                event.preventDefault();
                setAutocompleteOpen(false);
                setHighlightIndex(-1);
            }
            return;
        }

        if (event.key === "ArrowDown") {
            if (!open && items.length > 0) setAutocompleteOpen(true);
            if (items.length > 0) {
                event.preventDefault();
                setHighlightIndex((i) => (i < items.length - 1 ? i + 1 : 0));
            }
            return;
        }

        if (event.key === "ArrowUp") {
            if (items.length > 0 && open) {
                event.preventDefault();
                setHighlightIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
            }
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            if (open && highlightIndex >= 0 && items[highlightIndex]) {
                applySuggestion(items[highlightIndex]);
                return;
            }
            void searchLocation();
        }
    };

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setAutocompleteOpen(true);
                        }}
                        onFocus={() => {
                            if (blurCloseTimer.current) {
                                clearTimeout(blurCloseTimer.current);
                                blurCloseTimer.current = null;
                            }
                            setAutocompleteOpen(true);
                        }}
                        onBlur={() => {
                            blurCloseTimer.current = setTimeout(() => {
                                setAutocompleteOpen(false);
                                setHighlightIndex(-1);
                            }, 200);
                        }}
                        onKeyDown={handleSearchKeyDown}
                        role="combobox"
                        aria-expanded={autocompleteOpen && autocompleteItems.length > 0}
                        aria-autocomplete="list"
                        aria-controls="location-map-picker-suggestions"
                        placeholder="Search station location, city, road, or landmark..."
                        className="h-10 rounded-xl pl-9"
                        autoComplete="off"
                    />
                    {autocompleteOpen &&
                    (autocompleteLoading ||
                        autocompleteItems.length > 0 ||
                        query.trim().length >= AUTOCOMPLETE_MIN_CHARS) ? (
                        <div
                            id="location-map-picker-suggestions"
                            role="listbox"
                            className="absolute left-0 right-0 top-full z-[1000] mt-1 max-h-60 overflow-auto rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-md"
                        >
                            {autocompleteLoading && autocompleteItems.length === 0 ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                                    Searching…
                                </div>
                            ) : null}
                            {!autocompleteLoading &&
                            query.trim().length >= AUTOCOMPLETE_MIN_CHARS &&
                            autocompleteItems.length === 0 ? (
                                <p className="px-3 py-2 text-xs text-muted-foreground">
                                    No matches. Try another spelling or press Search.
                                </p>
                            ) : null}
                            {autocompleteItems.map((item, index) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    role="option"
                                    aria-selected={highlightIndex === index}
                                    className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs transition-colors ${
                                        highlightIndex === index
                                            ? "bg-accent text-accent-foreground"
                                            : "hover:bg-muted/80"
                                    }`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => applySuggestion(item)}
                                >
                                    <span className="line-clamp-2 font-medium text-foreground">
                                        {item.displayName}
                                    </span>
                                    {item.distanceKm != null ? (
                                        <span className="text-[11px] text-muted-foreground">
                                            ~{item.distanceKm.toFixed(1)} km away
                                        </span>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={searching}
                    onClick={() => void searchLocation()}
                >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
            </div>

            <div className={`overflow-hidden rounded-xl ${mapClassName}`}>
                <MapContainer
                    center={position || DEFAULT_CENTER}
                    zoom={position ? SELECTED_ZOOM : DEFAULT_ZOOM}
                    scrollWheelZoom
                    className="h-full min-h-[260px] w-full"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onPick={pickLocation} />
                    <SyncMapView position={position} />
                    {position ? (
                        <Marker
                            position={position}
                            icon={pickerIcon}
                            draggable
                            eventHandlers={markerHandlers}
                        />
                    ) : null}
                </MapContainer>
            </div>

            <p className="text-xs text-muted-foreground">
                Search, click, or drag the pin to pinpoint your charging station.
            </p>

            {suggestions.length > 1 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-xs font-medium text-slate-700">
                        Nearby recommendations
                    </p>
                    <div className="mt-2 space-y-2">
                        {suggestions.slice(0, 4).map((suggestion) => (
                            <button
                                key={suggestion.id}
                                type="button"
                                onClick={() => {
                                    setCoordinates(suggestion.lat, suggestion.lng);
                                    setDetectedAddress({
                                        city: suggestion.city,
                                        address: suggestion.displayName,
                                    });
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left transition-colors hover:bg-slate-100"
                            >
                                <p className="line-clamp-2 text-xs text-slate-800">
                                    {suggestion.displayName}
                                </p>
                                {suggestion.distanceKm != null ? (
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        ~{suggestion.distanceKm.toFixed(1)} km from current pin
                                    </p>
                                ) : null}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {onUseDetectedAddress && detectedAddress ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                    <p className="line-clamp-2">
                        Detected address: {detectedAddress.address}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 h-8 rounded-lg border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100"
                        onClick={() => onUseDetectedAddress(detectedAddress)}
                    >
                        Use detected address
                    </Button>
                </div>
            ) : reverseLoading ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Detecting address...
                </p>
            ) : null}
        </div>
    );
}
