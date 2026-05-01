"use client";

import { useCallback, useEffect, useMemo } from "react";
import L from "leaflet";
import {
    MapContainer,
    Marker,
    Popup,
    Polyline,
    TileLayer,
    useMap,
    useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { MapPointWithLabel, MapRoutePoint, MapViewStation, PickMode } from "./map-view";

type Availability = "Available" | "Limited Availability" | "Fully Booked" | "Closed";

interface MapViewLeafletProps {
    stations?: MapViewStation[];
    center?: MapRoutePoint;
    routePath?: MapRoutePoint[];
    origin?: MapPointWithLabel;
    destination?: MapPointWithLabel;
    waypoints?: MapPointWithLabel[];
    highlightedStationIds?: string[];
    className?: string;
    pickMode?: PickMode;
    onOriginDrag?: (lat: number, lng: number) => void;
    onDestinationDrag?: (lat: number, lng: number) => void;
    onWaypointDrag?: (index: number, lat: number, lng: number) => void;
    onMapPick?: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER: [number, number] = [7.8731, 80.7718];

const markerIcon = new L.DivIcon({
    html: '<div style="background:#0f766e;color:white;border-radius:999px;width:18px;height:18px;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,.25);"></div>',
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

const highlightedMarkerIcon = new L.DivIcon({
    html: '<div style="background:#2563eb;color:white;border-radius:999px;width:20px;height:20px;border:2px solid white;box-shadow:0 6px 14px rgba(37,99,235,.45);"></div>',
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

const originIcon = new L.DivIcon({
    html: `<div style="background:#16a34a;color:white;border-radius:999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:3px solid white;box-shadow:0 4px 12px rgba(22,163,74,.4);cursor:grab;">S</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
});

const destinationIcon = new L.DivIcon({
    html: `<div style="background:#dc2626;color:white;border-radius:999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:3px solid white;box-shadow:0 4px 12px rgba(220,38,38,.4);cursor:grab;">D</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
});

function createWaypointIcon(label: string) {
    return new L.DivIcon({
        html: `<div style="background:#7c3aed;color:white;border-radius:999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:3px solid white;box-shadow:0 4px 12px rgba(124,58,237,.4);cursor:grab;">${label}</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
}

function getStatusColor(status?: Availability) {
    if (status === "Available") return "#16a34a";
    if (status === "Limited Availability") return "#d97706";
    if (status === "Fully Booked") return "#dc2626";
    if (status === "Closed") return "#475569";
    return "#6b7280";
}

function FitBounds({ boundsPoints }: { boundsPoints: Array<[number, number]> }) {
    const map = useMap();

    useEffect(() => {
        if (boundsPoints.length === 0) return;
        const bounds = L.latLngBounds(boundsPoints);
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    }, [map, boundsPoints]);

    return null;
}

function MapClickHandler({ onMapPick, pickMode }: { onMapPick?: (lat: number, lng: number) => void; pickMode?: PickMode }) {
    const map = useMap();

    useEffect(() => {
        if (pickMode) {
            map.getContainer().style.cursor = "crosshair";
        } else {
            map.getContainer().style.cursor = "";
        }
        return () => {
            map.getContainer().style.cursor = "";
        };
    }, [map, pickMode]);

    useMapEvents({
        click(e) {
            if (pickMode && onMapPick) {
                onMapPick(e.latlng.lat, e.latlng.lng);
            }
        },
    });

    return null;
}

function getPickModeBannerText(pickMode: PickMode): string | null {
    if (!pickMode) return null;
    if (pickMode === "origin") return "Click on the map to set your origin";
    if (pickMode === "destination") return "Click on the map to set your destination";
    if (pickMode.startsWith("waypoint-")) return "Click on the map to set your stop";
    return null;
}

export default function MapViewLeaflet({
    stations = [],
    center,
    routePath = [],
    origin,
    destination,
    waypoints = [],
    highlightedStationIds = [],
    className = "",
    pickMode,
    onOriginDrag,
    onDestinationDrag,
    onWaypointDrag,
    onMapPick,
}: MapViewLeafletProps) {
    const validStations = useMemo(
        () =>
            stations.filter((station) =>
                Number.isFinite(Number(station.location?.latitude)) &&
                Number.isFinite(Number(station.location?.longitude))
            ),
        [stations]
    );

    const routePolyline: LatLngExpression[] = useMemo(
        () => routePath.map((point) => [point.lat, point.lng]),
        [routePath]
    );

    const mapCenter: [number, number] = useMemo(() => {
        if (center) return [center.lat, center.lng];
        if (origin) return [origin.lat, origin.lng];
        if (validStations.length > 0) {
            return [Number(validStations[0].location.latitude), Number(validStations[0].location.longitude)];
        }
        return DEFAULT_CENTER;
    }, [center, origin, validStations]);

    const boundsPoints = useMemo(() => {
        const points: Array<[number, number]> = [];
        for (const point of routePath) points.push([point.lat, point.lng]);
        for (const station of validStations) {
            points.push([Number(station.location.latitude), Number(station.location.longitude)]);
        }
        if (origin) points.push([origin.lat, origin.lng]);
        if (destination) points.push([destination.lat, destination.lng]);
        for (const waypoint of waypoints) points.push([waypoint.lat, waypoint.lng]);
        return points;
    }, [routePath, validStations, origin, destination, waypoints]);

    const originDragHandlers = useMemo(
        () => ({
            dragend(e: L.LeafletEvent) {
                const pos = (e.target as L.Marker).getLatLng();
                onOriginDrag?.(pos.lat, pos.lng);
            },
        }),
        [onOriginDrag]
    );

    const destinationDragHandlers = useMemo(
        () => ({
            dragend(e: L.LeafletEvent) {
                const pos = (e.target as L.Marker).getLatLng();
                onDestinationDrag?.(pos.lat, pos.lng);
            },
        }),
        [onDestinationDrag]
    );

    const makeWaypointDragHandler = useCallback(
        (idx: number) => ({
            dragend(e: L.LeafletEvent) {
                const pos = (e.target as L.Marker).getLatLng();
                onWaypointDrag?.(idx, pos.lat, pos.lng);
            },
        }),
        [onWaypointDrag]
    );

    const bannerText = getPickModeBannerText(pickMode ?? null);

    return (
        <div className={`relative isolate overflow-hidden rounded-xl border border-border ${className}`}>
            {bannerText && (
                <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 shadow-md">
                    {bannerText}
                </div>
            )}
            <MapContainer center={mapCenter} zoom={10} scrollWheelZoom className="h-full min-h-[280px] w-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler onMapPick={onMapPick} pickMode={pickMode} />

                {routePolyline.length > 1 && (
                    <Polyline positions={routePolyline} pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.8 }} />
                )}

                {origin && (
                    <Marker
                        position={[origin.lat, origin.lng]}
                        icon={originIcon}
                        draggable
                        eventHandlers={originDragHandlers}
                    >
                        <Popup>
                            <div className="text-sm font-medium">{origin.label || "Origin"}</div>
                            <div className="text-xs text-gray-500">Drag to adjust</div>
                        </Popup>
                    </Marker>
                )}

                {destination && (
                    <Marker
                        position={[destination.lat, destination.lng]}
                        icon={destinationIcon}
                        draggable
                        eventHandlers={destinationDragHandlers}
                    >
                        <Popup>
                            <div className="text-sm font-medium">{destination.label || "Destination"}</div>
                            <div className="text-xs text-gray-500">Drag to adjust</div>
                        </Popup>
                    </Marker>
                )}

                {waypoints.map((waypoint, idx) => (
                    <Marker
                        key={`waypoint-${idx}-${waypoint.lat}-${waypoint.lng}`}
                        position={[waypoint.lat, waypoint.lng]}
                        icon={createWaypointIcon(String(idx + 1))}
                        draggable
                        eventHandlers={makeWaypointDragHandler(idx)}
                    >
                        <Popup>
                            <div className="text-sm font-medium">
                                {waypoint.label || `Stop ${idx + 1}`}
                            </div>
                            <div className="text-xs text-gray-500">Drag to adjust</div>
                        </Popup>
                    </Marker>
                ))}

                {validStations.map((station) => {
                    const isHighlighted = highlightedStationIds.includes(station._id);
                    const dotColor = getStatusColor(station.availabilityStatus);

                    return (
                        <Marker
                            key={station._id}
                            position={[Number(station.location.latitude), Number(station.location.longitude)]}
                            icon={isHighlighted ? highlightedMarkerIcon : markerIcon}
                        >
                            <Popup>
                                <div className="space-y-1 text-sm">
                                    <p className="font-semibold">{station.name}</p>
                                    {station.city && <p className="text-muted-foreground">{station.city}</p>}
                                    {station.availabilityStatus && (
                                        <div className="inline-flex items-center gap-1">
                                            <span
                                                className="inline-block h-2 w-2 rounded-full"
                                                style={{ backgroundColor: dotColor }}
                                            />
                                            <span>{station.availabilityStatus}</span>
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {boundsPoints.length > 0 && <FitBounds boundsPoints={boundsPoints} />}
            </MapContainer>
        </div>
    );
}
