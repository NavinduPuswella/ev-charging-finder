"use client";

import { KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
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

const DEFAULT_CENTER: [number, number] = [7.8731, 80.7718];
const DEFAULT_ZOOM = 7;
const SELECTED_ZOOM = 16;

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

    const searchLocation = async () => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            toast.error("Enter a location to search.");
            return;
        }

        setSearching(true);
        try {
            const params = new URLSearchParams({
                format: "jsonv2",
                q: trimmedQuery,
                limit: "1",
                addressdetails: "1",
            });
            const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
            if (!res.ok) throw new Error("Location search failed");

            const results = (await res.json()) as NominatimSearchResult[];
            const result = results[0];
            if (!result) {
                toast.error("No matching location found.");
                return;
            }

            const lat = Number(result.lat);
            const lng = Number(result.lon);
            if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
                toast.error("The searched location returned invalid coordinates.");
                return;
            }

            setCoordinates(lat, lng);
            setDetectedAddress({
                city: getCity(result),
                address: result.display_name,
            });
            toast.success("Location found. Drag the pin if needed.");
        } catch {
            toast.error("Couldn't search that location. Please try again.");
        } finally {
            setSearching(false);
        }
    };

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
        if (event.key !== "Enter") return;
        event.preventDefault();
        void searchLocation();
    };

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search station location, city, road, or landmark..."
                        className="h-10 rounded-xl pl-9"
                    />
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
