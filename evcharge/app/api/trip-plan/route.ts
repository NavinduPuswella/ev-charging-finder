import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import { getCurrentOccupancyMap } from "@/lib/booking-availability";
import { optimizeRouteWithGemini } from "@/lib/ai-route-optimizer";

type RoutePoint = { lat: number; lng: number };

interface TripPlanRequestBody {
    origin: RoutePoint;
    destination: RoutePoint;
    vehicleRangeKm: number;
    chargerType?: string;
    corridorKm?: number;
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
    progress: number;
    estimatedWaitMinutes: number;
    estimatedChargeCostLkr: number;
}

function getAvailabilityLabel(
    availableNow: number,
    totalChargingPoints: number,
    stationStatus?: "AVAILABLE" | "LIMITED" | "MAINTENANCE" | "INACTIVE"
) {
    if (stationStatus === "INACTIVE" || stationStatus === "MAINTENANCE") {
        return "Closed" as const;
    }
    if (availableNow <= 0) return "Fully Booked" as const;
    if (availableNow <= Math.max(1, Math.ceil(totalChargingPoints * 0.3))) {
        return "Limited Availability" as const;
    }
    return "Available" as const;
}

function toRad(value: number) {
    return (value * Math.PI) / 180;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentDistanceKm(point: RoutePoint, a: RoutePoint, b: RoutePoint) {
    const kmPerDegLat = 111.32;
    const kmPerDegLng = 111.32 * Math.cos(toRad((a.lat + b.lat + point.lat) / 3));

    const px = point.lng * kmPerDegLng;
    const py = point.lat * kmPerDegLat;
    const ax = a.lng * kmPerDegLng;
    const ay = a.lat * kmPerDegLat;
    const bx = b.lng * kmPerDegLng;
    const by = b.lat * kmPerDegLat;

    const abx = bx - ax;
    const aby = by - ay;
    const abSquared = abx * abx + aby * aby;
    if (abSquared === 0) return Math.hypot(px - ax, py - ay);

    const apx = px - ax;
    const apy = py - ay;
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abSquared));
    const closestX = ax + t * abx;
    const closestY = ay + t * aby;
    return Math.hypot(px - closestX, py - closestY);
}

function getDistanceToRouteKm(point: RoutePoint, routePoints: RoutePoint[]) {
    if (routePoints.length < 2) return Number.POSITIVE_INFINITY;

    let minDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < routePoints.length - 1; i += 1) {
        const distance = pointToSegmentDistanceKm(point, routePoints[i], routePoints[i + 1]);
        if (distance < minDistance) minDistance = distance;
    }
    return minDistance;
}

function estimateWaitMinutes(totalChargingPoints: number, occupiedNow: number, availableNow: number) {
    if (totalChargingPoints <= 0) return 45;
    const utilization = Math.min(1, Math.max(0, occupiedNow / totalChargingPoints));

    if (availableNow <= 0) return Math.round(25 + utilization * 35);
    if (availableNow === 1) return Math.round(8 + utilization * 18);
    return Math.round(2 + utilization * 10);
}

function getClosestPointIndex(point: RoutePoint, routePoints: RoutePoint[]) {
    let index = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < routePoints.length; i += 1) {
        const rp = routePoints[i];
        const distance = haversineKm(point.lat, point.lng, rp.lat, rp.lng);
        if (distance < minDistance) {
            minDistance = distance;
            index = i;
        }
    }

    return index;
}

async function fetchRouteFromOsrm(origin: RoutePoint, destination: RoutePoint) {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
        throw new Error("Failed to fetch route from OpenStreetMap routing service.");
    }

    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) {
        throw new Error("No route found for this origin and destination.");
    }

    const routePath: RoutePoint[] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({ lat, lng })
    );

    return {
        routePath,
        distanceKm: route.distance / 1000,
        durationMinutes: route.duration / 60,
    };
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as TripPlanRequestBody;
        const { origin, destination, vehicleRangeKm, chargerType, corridorKm = 7 } = body;

        if (!origin || !destination) {
            return NextResponse.json({ error: "Origin and destination are required." }, { status: 400 });
        }
        if (!vehicleRangeKm || vehicleRangeKm <= 0) {
            return NextResponse.json({ error: "Vehicle range must be greater than 0." }, { status: 400 });
        }

        const { routePath, distanceKm, durationMinutes } = await fetchRouteFromOsrm(origin, destination);

        await dbConnect();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter: any = { isApproved: true };
        if (chargerType) filter.chargerType = chargerType;

        const stations = await Station.find(filter);
        const occupancyMap = await getCurrentOccupancyMap(stations.map((s) => String(s._id)));

        const stationsOnRoute: RouteStation[] = stations
            .map((stationDoc) => {
                const station = stationDoc.toObject();
                const totalChargingPoints = station.totalChargingPoints || station.totalSlots || 0;
                const occupiedNow = occupancyMap.get(String(station._id)) || 0;
                const isClosed = station.status === "INACTIVE" || station.status === "MAINTENANCE";
                const availableNow = isClosed ? 0 : Math.max(totalChargingPoints - occupiedNow, 0);
                const estimatedWaitMinutes = estimateWaitMinutes(totalChargingPoints, occupiedNow, availableNow);
                const typicalTopUpKwh = Math.max(12, Math.min(45, vehicleRangeKm * 0.12));
                const point = {
                    lat: station.location.latitude,
                    lng: station.location.longitude,
                };

                const distanceToRouteKm = getDistanceToRouteKm(point, routePath);
                const closestIndex = getClosestPointIndex(point, routePath);
                const progress = routePath.length > 1 ? closestIndex / (routePath.length - 1) : 0;

                return {
                    _id: String(station._id),
                    name: station.name,
                    city: station.city,
                    chargerType: station.chargerType,
                    pricePerKwh: station.pricePerKwh,
                    rating: station.rating || 0,
                    availableNow,
                    totalChargingPoints,
                    availabilityStatus: getAvailabilityLabel(
                        availableNow,
                        totalChargingPoints,
                        station.status
                    ),
                    location: station.location,
                    distanceToRouteKm,
                    distanceFromStartKm: progress * distanceKm,
                    progress,
                    estimatedWaitMinutes,
                    estimatedChargeCostLkr: Math.round(station.pricePerKwh * typicalTopUpKwh),
                };
            })
            .filter((station) => station.distanceToRouteKm <= corridorKm)
            .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

        const safeRangeKm = Math.max(vehicleRangeKm * 0.8, 20);
        const plannedStops: RouteStation[] = [];
        const usedStationIds = new Set<string>();
        let currentProgress = 0;

        for (let i = 0; i < 8; i += 1) {
            const remainingDistanceKm = distanceKm * (1 - currentProgress);
            if (remainingDistanceKm <= safeRangeKm) break;

            const reachableCandidates = stationsOnRoute
                .filter((station) => {
                    if (usedStationIds.has(station._id)) return false;
                    if (station.availableNow <= 0) return false;
                    if (station.progress <= currentProgress + 0.01) return false;
                    const segmentDistance = distanceKm * (station.progress - currentProgress);
                    return segmentDistance <= safeRangeKm;
                })
                .sort((a, b) => {
                    const scoreA =
                        a.estimatedWaitMinutes * 0.48 +
                        a.pricePerKwh * 0.32 +
                        a.distanceToRouteKm * 0.14 -
                        a.rating * 0.06;
                    const scoreB =
                        b.estimatedWaitMinutes * 0.48 +
                        b.pricePerKwh * 0.32 +
                        b.distanceToRouteKm * 0.14 -
                        b.rating * 0.06;
                    if (Math.abs(scoreA - scoreB) > 0.01) return scoreA - scoreB;
                    if (Math.abs(b.progress - a.progress) > 0.001) return b.progress - a.progress;
                    return b.availableNow - a.availableNow;
                });

            const selected = reachableCandidates[0];
            if (!selected) break;

            plannedStops.push(selected);
            usedStationIds.add(selected._id);
            currentProgress = selected.progress;
        }

        const canReachDestination = distanceKm * (1 - currentProgress) <= safeRangeKm;
        const aiOptimization = await optimizeRouteWithGemini({
            routeDistanceKm: distanceKm,
            routeDurationMinutes: durationMinutes,
            planningRangeKm: safeRangeKm,
            safeStops: plannedStops,
            candidateStations: stationsOnRoute,
        });

        const stationById = new Map(stationsOnRoute.map((station) => [station._id, station]));
        const aiRecommendedStops = aiOptimization.optimizedStopIds
            .map((id) => stationById.get(id))
            .filter((station): station is RouteStation => Boolean(station));
        const finalRecommendedStops = aiRecommendedStops.length > 0 ? aiRecommendedStops : plannedStops;

        return NextResponse.json({
            route: {
                distanceKm: Math.round(distanceKm * 10) / 10,
                durationMinutes: Math.round(durationMinutes),
                routePath,
            },
            safety: {
                vehicleRangeKm,
                planningRangeKm: Math.round(safeRangeKm * 10) / 10,
                canReachDestination,
                note: canReachDestination
                    ? "Route can be completed with this stop plan."
                    : "Could not guarantee destination reach with available stations on this route.",
            },
            stationsOnRoute: stationsOnRoute.slice(0, 40),
            recommendedStops: finalRecommendedStops,
            aiOptimization: {
                provider: aiOptimization.provider,
                enabled: aiOptimization.enabled,
                summary: aiOptimization.summary,
                scoreBreakdown: aiOptimization.scoreBreakdown,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
