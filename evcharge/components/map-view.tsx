"use client";

import { MapPin } from "lucide-react";

interface MapViewProps {
    stations?: Array<{
        _id: string;
        name: string;
        location: { latitude: number; longitude: number };
    }>;
    center?: { lat: number; lng: number };
    className?: string;
}

export default function MapView({ stations = [], center, className = "" }: MapViewProps) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // If we have an API key, show an actual embedded map
    if (apiKey && apiKey !== "your_google_maps_api_key") {
        const centerLat = center?.lat || (stations.length > 0 ? stations[0].location.latitude : 7.8731);
        const centerLng = center?.lng || (stations.length > 0 ? stations[0].location.longitude : 80.7718);

        const markers = stations
            .map((s) => `markers=color:green|label:${s.name.charAt(0)}|${s.location.latitude},${s.location.longitude}`)
            .join("&");

        const src = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${centerLat},${centerLng}&zoom=10&${markers}`;

        return (
            <div className={`relative rounded-xl overflow-hidden border border-border ${className}`}>
                <iframe
                    src={src}
                    className="w-full h-full min-h-[400px]"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>
        );
    }

    // Fallback: attractive placeholder map
    return (
        <div
            className={`relative rounded-xl overflow-hidden border border-border bg-gradient-to-br from-green-50 to-green-100 ${className}`}
        >
            <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
                <div className="relative mb-6">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 h-16 w-16" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                        <MapPin className="h-8 w-8" />
                    </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Map View</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                    Add your Google Maps API key to <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.env.local</code> to see station locations on an interactive map.
                </p>
                {stations.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                        {stations.slice(0, 6).map((station) => (
                            <div
                                key={station._id}
                                className="flex items-center gap-2 rounded-lg bg-white/80 p-2 text-sm shadow-sm"
                            >
                                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="truncate">{station.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
