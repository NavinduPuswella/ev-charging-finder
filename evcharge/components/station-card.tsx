"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Zap, DollarSign } from "lucide-react";

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
        <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            {/* Green accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-green-400 to-green-600" />
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{station.name}</CardTitle>
                    <Badge variant="success" className="shrink-0">
                        <Zap className="h-3 w-3 mr-1" />
                        {station.chargerType}
                    </Badge>
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
                        <DollarSign className="h-4 w-4 text-primary mb-1" />
                        <span className="text-sm font-semibold">LKR {station.pricePerKwh}</span>
                        <span className="text-xs text-muted-foreground">Price per kWh</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2">
                        <Zap className="h-4 w-4 text-primary mb-1" />
                        <span className="text-sm font-semibold">{station.totalSlots}</span>
                        <span className="text-xs text-muted-foreground">Charging Points</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Link href={`/stations/${station._id}`} className="w-full">
                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        View Details
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
