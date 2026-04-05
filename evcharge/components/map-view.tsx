"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

export interface MapViewStation {
    _id: string;
    name: string;
    city?: string;
    availabilityStatus?: "Available" | "Limited Availability" | "Fully Booked" | "Closed";
    location: { latitude: number; longitude: number };
}

export interface MapRoutePoint {
    lat: number;
    lng: number;
}

export interface MapPointWithLabel extends MapRoutePoint {
    label?: string;
}

interface MapViewProps {
    stations?: MapViewStation[];
    center?: MapRoutePoint;
    routePath?: MapRoutePoint[];
    origin?: MapPointWithLabel;
    destination?: MapPointWithLabel;
    highlightedStationIds?: string[];
    className?: string;
}

const LeafletMap = dynamic(() => import("./map-view-leaflet"), {
    ssr: false,
    loading: () => (
        <div className="flex min-h-[250px] items-center justify-center bg-muted/30">
            <MapPin className="h-6 w-6 animate-pulse text-primary" />
        </div>
    ),
});

export default function MapView(props: MapViewProps) {
    return <LeafletMap {...props} />;
}
