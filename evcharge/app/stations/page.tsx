"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import StationCard from "@/components/station-card";
import MapView from "@/components/map-view";
import { Search, Filter, MapPin, Loader2 } from "lucide-react";

interface Station {
    _id: string;
    name: string;
    city: string;
    chargerType: string;
    pricePerKwh: number;
    rating: number;
    totalSlots: number;
    isApproved: boolean;
    location: { latitude: number; longitude: number };
}

export default function StationsPage() {
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [city, setCity] = useState("");
    const [chargerType, setChargerType] = useState("all");
    const [showMap, setShowMap] = useState(false);

    const fetchStations = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (city) params.set("city", city);
        if (chargerType && chargerType !== "all") params.set("chargerType", chargerType);

        const res = await fetch(`/api/stations?${params}`);
        const data = await res.json();
        setStations(data.stations || []);
        setLoading(false);
    };

    useEffect(() => { fetchStations(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchStations();
    };

    return (
        <div className="min-h-[calc(100vh-4rem)]">
            {/* Search Header */}
            <div className="bg-gradient-to-r from-green-50 to-white border-b border-border">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold mb-2">Find Charging Stations</h1>
                    <p className="text-muted-foreground mb-6">Search and filter EV charging stations near you</p>

                    <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by city..."
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={chargerType} onValueChange={setChargerType}>
                            <SelectTrigger className="w-full sm:w-44">
                                <SelectValue placeholder="Charger Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="Type1">BMW</SelectItem>
                                <SelectItem value="Type2">Nissan</SelectItem>
                                <SelectItem value="CCS">BYD 1</SelectItem>
                                <SelectItem value="CHAdeMO">BYD 2</SelectItem>
                                <SelectItem value="Tesla">Tesla</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button type="submit" className="gap-2">
                            <Filter className="h-4 w-4" /> Search
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowMap(!showMap)} className="gap-2">
                            <MapPin className="h-4 w-4" /> {showMap ? "Hide Map" : "Show Map"}
                        </Button>
                    </form>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Map View */}
                {showMap && (
                    <div className="mb-8">
                        <MapView stations={stations} className="h-[400px]" />
                    </div>
                )}

                {/* Results */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : stations.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <MapPin className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-1">No stations found</h3>
                            <p className="text-muted-foreground">Try adjusting your search filters or search in a different city.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground mb-4">
                            Found <span className="font-semibold text-foreground">{stations.length}</span> station{stations.length !== 1 ? "s" : ""}
                        </p>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {stations.map((station) => (
                                <StationCard key={station._id} station={station} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
