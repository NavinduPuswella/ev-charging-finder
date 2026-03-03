"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import MapView from "@/components/map-view";
import { Route, MapPin, Zap, Star, Navigation, Loader2, Battery } from "lucide-react";

interface Recommendation {
    station: {
        _id: string;
        name: string;
        city: string;
        chargerType: string;
        pricePerKwh: number;
        rating: number;
        location: { latitude: number; longitude: number };
        availableSlots: number;
    };
    score: number;
    distanceKm: number;
}

export default function TripPlannerPage() {
    const [sourceLat, setSourceLat] = useState("");
    const [sourceLng, setSourceLng] = useState("");
    const [destLat, setDestLat] = useState("");
    const [destLng, setDestLng] = useState("");
    const [vehicleRange, setVehicleRange] = useState("");
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(false);

    const handlePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Use midpoint for recommendation
        const lat = (Number(sourceLat) + Number(destLat)) / 2;
        const lng = (Number(sourceLng) + Number(destLng)) / 2;

        const res = await fetch("/api/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: lat, longitude: lng, vehicleRange: Number(vehicleRange) || 200 }),
        });
        const data = await res.json();
        setRecommendations(data.recommendations || []);
        setLoading(false);
    };

    return (
        <div className="min-h-[calc(100vh-4rem)]">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-white border-b border-border">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Route className="h-5 w-5" />
                        </div>
                        <h1 className="text-3xl font-bold">Trip Planner</h1>
                    </div>
                    <p className="text-muted-foreground">Plan your route and get best-recommended charging stops based on your vehicle&apos;s range.</p>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Input Form */}
                    <div>
                        <Card>
                            <CardHeader><CardTitle>Route Details</CardTitle></CardHeader>
                            <CardContent>
                                <form onSubmit={handlePlan} className="space-y-4">
                                    <div className="space-y-3">
                                        <h3 className="font-medium text-sm flex items-center gap-2"><Navigation className="h-4 w-4 text-primary" /> Source</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><Label className="text-xs">Latitude</Label><Input type="number" step="any" placeholder="e.g. 6.9271" value={sourceLat} onChange={(e) => setSourceLat(e.target.value)} required /></div>
                                            <div><Label className="text-xs">Longitude</Label><Input type="number" step="any" placeholder="e.g. 79.8612" value={sourceLng} onChange={(e) => setSourceLng(e.target.value)} required /></div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="font-medium text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-red-500" /> Destination</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><Label className="text-xs">Latitude</Label><Input type="number" step="any" placeholder="e.g. 7.2906" value={destLat} onChange={(e) => setDestLat(e.target.value)} required /></div>
                                            <div><Label className="text-xs">Longitude</Label><Input type="number" step="any" placeholder="e.g. 80.6337" value={destLng} onChange={(e) => setDestLng(e.target.value)} required /></div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Battery className="h-4 w-4 text-primary" /> Vehicle Range (km)</Label>
                                        <Input type="number" placeholder="e.g. 300" value={vehicleRange} onChange={(e) => setVehicleRange(e.target.value)} />
                                    </div>
                                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
                                        {loading ? "Finding stops..." : "Find Charging Stops"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Results */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Map */}
                        <MapView
                            stations={recommendations.map((r) => ({
                                _id: r.station._id,
                                name: r.station.name,
                                location: r.station.location,
                            }))}
                            center={sourceLat && sourceLng ? { lat: Number(sourceLat), lng: Number(sourceLng) } : undefined}
                            className="h-[350px]"
                        />

                        {/* Recommendations */}
                        {recommendations.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-primary" />
                                    Recommended Charging Stops
                                </h2>
                                <div className="space-y-4">
                                    {recommendations.map((r, i) => (
                                        <Card key={r.station._id} className="hover:shadow-lg transition-all">
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-4">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-lg">{r.station.name}</h3>
                                                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                                                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.station.city}</span>
                                                                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-500" />{r.station.rating}</span>
                                                                <Badge variant="success">{r.station.chargerType}</Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-medium text-primary">{r.distanceKm} km</div>
                                                        <div className="text-xs text-muted-foreground">Score: {r.score}</div>
                                                        <div className="text-sm font-semibold mt-1">${r.station.pricePerKwh}/kWh</div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {recommendations.length === 0 && !loading && (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <Route className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold mb-1">Plan Your Trip</h3>
                                    <p className="text-muted-foreground">Enter your source, destination, and vehicle range to get AI-recommended charging stops along your route.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
