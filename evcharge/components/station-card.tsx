"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Star, Zap, Receipt } from "lucide-react";
import { formatChargingRate } from "@/lib/pricing";

interface StationCardProps {
    station: {
        _id: string;
        name: string;
        city: string;
        chargerType: string;
        pricePerKwh: number;
        rating: number;
        totalSlots: number;
        isApproved: boolean;
        location: { latitude: number; longitude: number };
    };
    distance?: number;
}

export default function StationCard({ station, distance }: StationCardProps) {
    return (
        <Card className="overflow-hidden">
            <div className="h-1 bg-primary" />
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{station.name}</CardTitle>
                    <div className="flex flex-wrap gap-1 shrink-0">
                        {station.chargerType.split(",").map((t) => t.trim()).filter(Boolean).map((type) => (
                            <Badge key={type} variant="success">
                                <Zap className="h-3 w-3 mr-1" />
                                {type}
                            </Badge>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {station.city}
                    {distance !== undefined && (
                        <span className="ml-2 text-primary font-medium">
                            {distance.toFixed(1)} km away
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pb-3">
                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
                        <Star className="h-4 w-4 text-yellow-500 mb-1" />
                        <span className="text-sm font-semibold">{station.rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">Rating</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
                        <Receipt className="h-4 w-4 text-primary mb-1" />
                        <span className="text-sm font-semibold">{formatChargingRate(station.pricePerKwh)}</span>
                        <span className="text-xs text-muted-foreground">Charging Rate</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
                        <Zap className="h-4 w-4 text-primary mb-1" />
                        <span className="text-sm font-semibold">{station.totalSlots}</span>
                        <span className="text-xs text-muted-foreground">Points</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Link href={`/stations/${station._id}`} className="w-full">
                    <Button className="w-full gap-2">
                        View Details
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
