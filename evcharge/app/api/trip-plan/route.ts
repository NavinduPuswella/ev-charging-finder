import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Station from "@/models/Station";
import { getCurrentOccupancyMap } from "@/lib/booking-availability";
import { optimizeRouteWithGemini } from "@/lib/ai-route-optimizer";

type RoutePoint = { lat: number; lng: number };

interface TripPlanRequestBody {
    origin: RoutePoint;
    destination: RoutePoint;
    waypoints?: RoutePoint[];
    vehicleRangeKm: number;
    chargerType?: string;
    corridorKm?: number;
    batteryCapacityKwh?: number;
    energyConsumptionKwhPerKm?: number;
    currentBatteryPercent?: number;
    targetBatteryPercent?: number;
}

interface RouteStation {
    _id: string;
    stationId: string;
    name: string;
    stationName: string;
    city: string;
    address: string;
    latitude: number;
    longitude: number;
    chargerType: string;
    chargerTypes: string;
    pricePerKwh: number;
    chargingRatePerKwh: number;
    reservationFeePerHour: number;
    rating: number;
    availableNow: number;
    availableSlots: number;
    totalChargingPoints: number;
    availabilityStatus: "Available" | "Limited Availability" | "Fully Booked" | "Closed";
    location: { latitude: number; longitude: number };
    distanceToRouteKm: number;
    distanceFromRouteKm: number;
    distanceFromOriginKm: number;
    distanceFromStartKm: number;
    progress: number;
    estimatedWaitMinutes: number;
    estimatedChargeCostLkr: number;
    estimatedKwhNeeded: number;
    estimatedBookingHours: number;
    estimatedChargingCost: number;
    estimatedReservationCost: number;
    totalEstimatedCost: number;
    isAvailable: boolean;
    connectorMatch: boolean;
    badges: string[];
    recommendationScore: number;
}

const DEFAULT_BATTERY_CAPACITY_KWH = 40;
const DEFAULT_ENERGY_CONSUMPTION_KWH_PER_KM = 0.15;
const DEFAULT_CURRENT_BATTERY_PERCENT = 80;
const DEFAULT_TARGET_BATTERY_PERCENT = 20;

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function normalizeInverse(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return 0;
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 1;
    return clamp(1 - (value - min) / (max - min), 0, 1);
}

function hasConnectorMatch(stationConnectorType: string, selectedConnectorType?: string) {
    if (!selectedConnectorType) return true;
    const stationTypes = stationConnectorType
        .split(",")
        .map((type) => type.trim().toLowerCase())
        .filter(Boolean);
    return stationTypes.includes(selectedConnectorType.trim().toLowerCase());
}

function compareByNearestRules(a: RouteStation, b: RouteStation) {
    if (Math.abs(a.distanceFromRouteKm - b.distanceFromRouteKm) > 0.001) {
        return a.distanceFromRouteKm - b.distanceFromRouteKm;
    }
    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
    if (a.connectorMatch !== b.connectorMatch) return a.connectorMatch ? -1 : 1;
    if (Math.abs(a.totalEstimatedCost - b.totalEstimatedCost) > 0.01) {
        return a.totalEstimatedCost - b.totalEstimatedCost;
    }
    return b.rating - a.rating;
}

function compareByCheapestRules(a: RouteStation, b: RouteStation) {
    if (Math.abs(a.totalEstimatedCost - b.totalEstimatedCost) > 0.01) {
        return a.totalEstimatedCost - b.totalEstimatedCost;
    }
    if (Math.abs(a.distanceFromRouteKm - b.distanceFromRouteKm) > 0.001) {
        return a.distanceFromRouteKm - b.distanceFromRouteKm;
    }
    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
    return b.rating - a.rating;
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

async function fetchRouteFromOsrm(points: RoutePoint[]) {
    if (points.length < 2) {
        throw new Error("At least two coordinates are required for routing.");
    }

    const coordinateString = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
        throw new Error("Failed to fetch route from OpenStreetMap routing service.");
    }

    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) {
        throw new Error("No route found for the provided locations.");
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
        const {
            origin,
            destination,
            waypoints = [],
            vehicleRangeKm,
            chargerType,
            corridorKm = 7,
            batteryCapacityKwh = DEFAULT_BATTERY_CAPACITY_KWH,
            energyConsumptionKwhPerKm = DEFAULT_ENERGY_CONSUMPTION_KWH_PER_KM,
            currentBatteryPercent = DEFAULT_CURRENT_BATTERY_PERCENT,
            targetBatteryPercent = DEFAULT_TARGET_BATTERY_PERCENT,
        } = body;

        if (!origin || !destination) {
            return NextResponse.json({ error: "Origin and destination are required." }, { status: 400 });
        }
        if (!vehicleRangeKm || vehicleRangeKm <= 0) {
            return NextResponse.json({ error: "Vehicle range must be greater than 0." }, { status: 400 });
        }

        const sanitizedWaypoints = waypoints
            .filter((wp): wp is RoutePoint =>
                !!wp && Number.isFinite(wp.lat) && Number.isFinite(wp.lng)
            )
            .slice(0, 3);

        if (sanitizedWaypoints.length !== waypoints.length) {
            return NextResponse.json(
                { error: "Each stop must have a valid location selected from suggestions." },
                { status: 400 }
            );
        }

        const routePoints: RoutePoint[] = [origin, ...sanitizedWaypoints, destination];
        const { routePath, distanceKm, durationMinutes } = await fetchRouteFromOsrm(routePoints);

        await dbConnect();
        
        const filter: any = { isApproved: true };
        if (chargerType) filter.chargerType = { $regex: chargerType, $options: "i" };

        const stations = await Station.find(filter);
        const occupancyMap = await getCurrentOccupancyMap(stations.map((s) => String(s._id)));

        const estimatedEnergyNeededKwhRaw = distanceKm * energyConsumptionKwhPerKm;
        const estimatedEnergyNeededKwh = Math.max(0, estimatedEnergyNeededKwhRaw);
        const batteryWindowPercent = clamp(currentBatteryPercent - targetBatteryPercent, 0, 100);
        const availableBatteryWindowKwh = (batteryCapacityKwh * batteryWindowPercent) / 100;
        const usableEnergyKwh = Math.max(estimatedEnergyNeededKwh, availableBatteryWindowKwh, 1);
        const estimatedBookingHours = clamp(Math.ceil(usableEnergyKwh / 25), 1, 5);

        const stationsOnRoute: RouteStation[] = stations
            .map((stationDoc) => {
                const station = stationDoc.toObject();
                const totalChargingPoints = station.totalChargingPoints || station.totalSlots || 0;
                const occupiedNow = occupancyMap.get(String(station._id)) || 0;
                const isClosed = station.status === "INACTIVE" || station.status === "MAINTENANCE";
                const availableNow = isClosed ? 0 : Math.max(totalChargingPoints - occupiedNow, 0);
                const estimatedWaitMinutes = estimateWaitMinutes(totalChargingPoints, occupiedNow, availableNow);
                const chargingRatePerKwh = Number.isFinite(Number(station.pricePerKwh))
                    ? Number(station.pricePerKwh)
                    : 0;
                const reservationFeePerHour = Number.isFinite(Number(station.reservationFeePerHour))
                    ? Number(station.reservationFeePerHour)
                    : 0;
                const point = {
                    lat: station.location.latitude,
                    lng: station.location.longitude,
                };

                const distanceToRouteKm = getDistanceToRouteKm(point, routePath);
                const distanceFromOriginKm = haversineKm(
                    origin.lat,
                    origin.lng,
                    station.location.latitude,
                    station.location.longitude
                );
                const closestIndex = getClosestPointIndex(point, routePath);
                const progress = routePath.length > 1 ? closestIndex / (routePath.length - 1) : 0;
                const connectorMatch = hasConnectorMatch(station.chargerType, chargerType);
                const estimatedChargingCost = Math.round(usableEnergyKwh * chargingRatePerKwh);
                const estimatedReservationCost = Math.round(estimatedBookingHours * reservationFeePerHour);
                const totalEstimatedCost = estimatedChargingCost + estimatedReservationCost;
                const isAvailable = availableNow > 0 && !isClosed;
                const stationId = String(station._id);

                return {
                    _id: stationId,
                    stationId,
                    name: station.name,
                    stationName: station.name,
                    city: station.city,
                    address: station.address || "",
                    latitude: station.location.latitude,
                    longitude: station.location.longitude,
                    chargerType: station.chargerType,
                    chargerTypes: station.chargerType,
                    pricePerKwh: chargingRatePerKwh,
                    chargingRatePerKwh,
                    reservationFeePerHour,
                    rating: station.rating || 0,
                    availableNow,
                    availableSlots: availableNow,
                    totalChargingPoints,
                    availabilityStatus: getAvailabilityLabel(
                        availableNow,
                        totalChargingPoints,
                        station.status
                    ),
                    location: station.location,
                    distanceToRouteKm,
                    distanceFromRouteKm: distanceToRouteKm,
                    distanceFromOriginKm,
                    distanceFromStartKm: progress * distanceKm,
                    progress,
                    estimatedWaitMinutes,
                    estimatedChargeCostLkr: estimatedChargingCost,
                    estimatedKwhNeeded: Math.round(usableEnergyKwh * 100) / 100,
                    estimatedBookingHours,
                    estimatedChargingCost,
                    estimatedReservationCost,
                    totalEstimatedCost,
                    isAvailable,
                    connectorMatch,
                    badges: [],
                    recommendationScore: 0,
                };
            })
            .filter((station) => station.distanceToRouteKm <= corridorKm)
            .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

        const costValues = stationsOnRoute.map((station) => station.totalEstimatedCost);
        const distanceValues = stationsOnRoute.map((station) => station.distanceFromRouteKm);
        const minCost = costValues.length ? Math.min(...costValues) : 0;
        const maxCost = costValues.length ? Math.max(...costValues) : 1;
        const minDistance = distanceValues.length ? Math.min(...distanceValues) : 0;
        const maxDistance = distanceValues.length ? Math.max(...distanceValues) : 1;

        for (const station of stationsOnRoute) {
            const distanceScore = normalizeInverse(station.distanceFromRouteKm, minDistance, maxDistance);
            const costScore = normalizeInverse(station.totalEstimatedCost, minCost, maxCost);
            const availabilityScore = station.isAvailable ? 1 : 0;
            const connectorScore = station.connectorMatch ? 1 : 0;
            const ratingScore = clamp(station.rating / 5, 0, 1);
            station.recommendationScore =
                distanceScore * 0.3 +
                costScore * 0.3 +
                availabilityScore * 0.2 +
                connectorScore * 0.15 +
                ratingScore * 0.05;
        }

        const nearestStation = [...stationsOnRoute].sort(compareByNearestRules)[0] || null;
        const cheapestStation = [...stationsOnRoute].sort(compareByCheapestRules)[0] || null;

        const availableAndMatchingStations = stationsOnRoute.filter(
            (station) => station.isAvailable && station.connectorMatch
        );
        const availableStations = stationsOnRoute.filter((station) => station.isAvailable);
        const recommendationPool =
            availableAndMatchingStations.length > 0
                ? availableAndMatchingStations
                : availableStations.length > 0
                    ? availableStations
                    : stationsOnRoute;
        const recommendedStation =
            [...recommendationPool].sort((a, b) => {
                if (Math.abs(b.recommendationScore - a.recommendationScore) > 0.0001) {
                    return b.recommendationScore - a.recommendationScore;
                }
                if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
                if (a.connectorMatch !== b.connectorMatch) return a.connectorMatch ? -1 : 1;
                if (Math.abs(a.totalEstimatedCost - b.totalEstimatedCost) > 0.01) {
                    return a.totalEstimatedCost - b.totalEstimatedCost;
                }
                if (Math.abs(a.distanceFromRouteKm - b.distanceFromRouteKm) > 0.001) {
                    return a.distanceFromRouteKm - b.distanceFromRouteKm;
                }
                return b.rating - a.rating;
            })[0] || null;

        for (const station of stationsOnRoute) {
            const badges: string[] = [];
            if (nearestStation && station._id === nearestStation._id) badges.push("Nearest");
            if (cheapestStation && station._id === cheapestStation._id) badges.push("Cheapest");
            if (recommendedStation && station._id === recommendedStation._id) badges.push("Recommended");
            if (station.isAvailable) badges.push("Available");
            if (station.connectorMatch) badges.push("Connector Match");
            station.badges = badges;
        }

        const recommendationReason = recommendedStation
            ? `Recommended because it is ${recommendedStation.distanceFromRouteKm.toFixed(1)} km from your route, ${
                recommendedStation.isAvailable
                    ? "has available"
                    : "currently has limited availability for"
            } ${recommendedStation.chargerType} chargers, and offers an estimated total stop cost of LKR ${recommendedStation.totalEstimatedCost.toLocaleString()}.`
            : "No station recommendation could be generated for this route.";

        const startUsablePercent = clamp(currentBatteryPercent - targetBatteryPercent, 0, 100);
        const postChargeUsablePercent = clamp(100 - targetBatteryPercent, 1, 100);
        const effectiveStartRangeKm = Math.max((vehicleRangeKm * startUsablePercent) / 100, 0);
        const postChargeRangeKm = Math.max((vehicleRangeKm * postChargeUsablePercent) / 100, 20);
        const safeRangeKm = postChargeRangeKm;

        const plannedStops: RouteStation[] = [];
        const usedStationIds = new Set<string>();
        let currentProgress = 0;
        let isFirstLeg = true;

        for (let i = 0; i < 8; i += 1) {
            const remainingDistanceKm = distanceKm * (1 - currentProgress);
            const legRangeKm = isFirstLeg ? effectiveStartRangeKm : postChargeRangeKm;
            if (remainingDistanceKm <= legRangeKm) break;

            const reachableCandidates = stationsOnRoute
                .filter((station) => {
                    if (usedStationIds.has(station._id)) return false;
                    if (station.availableNow <= 0) return false;
                    if (station.progress <= currentProgress + 0.01) return false;
                    const segmentDistance = distanceKm * (station.progress - currentProgress);
                    return segmentDistance <= legRangeKm;
                })
                .sort((a, b) => {
                    if (Math.abs(b.progress - a.progress) > 0.005) return b.progress - a.progress;
                    if (Math.abs(a.distanceFromRouteKm - b.distanceFromRouteKm) > 0.05) {
                        return a.distanceFromRouteKm - b.distanceFromRouteKm;
                    }
                    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
                    if (a.connectorMatch !== b.connectorMatch) return a.connectorMatch ? -1 : 1;
                    return b.rating - a.rating;
                });

            const selected = reachableCandidates[0];
            if (!selected) break;

            plannedStops.push(selected);
            usedStationIds.add(selected._id);
            currentProgress = selected.progress;
            isFirstLeg = false;
        }

        const finalLegRangeKm = plannedStops.length > 0 ? postChargeRangeKm : effectiveStartRangeKm;
        const canReachDestination = distanceKm * (1 - currentProgress) <= finalLegRangeKm;
        const chargingStopRequired = distanceKm > effectiveStartRangeKm;

        let finalRoutePath = routePath;
        let finalDistanceKm = distanceKm;
        let finalDurationMinutes = durationMinutes;
        let autoReroutedViaStops = false;

        if (plannedStops.length > 0) {
            try {
                const chargingWaypoints = plannedStops
                    .slice()
                    .sort((a, b) => a.progress - b.progress)
                    .map((s) => ({ lat: s.latitude, lng: s.longitude }));
                const reroutePoints: RoutePoint[] = [
                    origin,
                    ...sanitizedWaypoints,
                    ...chargingWaypoints,
                    destination,
                ];
                const rerouted = await fetchRouteFromOsrm(reroutePoints);
                finalRoutePath = rerouted.routePath;
                finalDistanceKm = rerouted.distanceKm;
                finalDurationMinutes = rerouted.durationMinutes;
                autoReroutedViaStops = true;
            } catch {
                autoReroutedViaStops = false;
            }
        }

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
        const estimatedTripChargingCost = recommendedStation
            ? recommendedStation.totalEstimatedCost
            : Math.round(usableEnergyKwh * (stationsOnRoute[0]?.chargingRatePerKwh || 0));

        const firstChargingStop = plannedStops[0] || null;
        const batteryAnalysisNote = !chargingStopRequired
            ? `Your battery (${currentBatteryPercent}%) provides ~${Math.round(effectiveStartRangeKm)} km of safe range — enough for this ${Math.round(distanceKm)} km trip without charging.`
            : firstChargingStop
                ? `Trip distance (${Math.round(distanceKm)} km) exceeds your safe range (~${Math.round(effectiveStartRangeKm)} km at ${currentBatteryPercent}% battery, reserving ${targetBatteryPercent}%). We auto-added ${plannedStops.length} charging stop${plannedStops.length > 1 ? "s" : ""} starting at "${firstChargingStop.name}" (~${Math.round(firstChargingStop.distanceFromStartKm)} km from origin).`
                : `Trip distance (${Math.round(distanceKm)} km) exceeds your safe range (~${Math.round(effectiveStartRangeKm)} km), but no suitable charging stations were found along the corridor.`;

        return NextResponse.json({
            routeDistanceKm: Math.round(finalDistanceKm * 10) / 10,
            routeDurationMinutes: Math.round(finalDurationMinutes),
            estimatedEnergyNeededKwh: Math.round(estimatedEnergyNeededKwh * 100) / 100,
            estimatedTripChargingCost,
            nearestStation,
            cheapestStation,
            recommendedStation,
            recommendationReason,
            route: {
                distanceKm: Math.round(finalDistanceKm * 10) / 10,
                durationMinutes: Math.round(finalDurationMinutes),
                routePath: finalRoutePath,
                autoReroutedViaStops,
                originalDistanceKm: Math.round(distanceKm * 10) / 10,
            },
            batteryAnalysis: {
                startBatteryPercent: currentBatteryPercent,
                minBatteryPercent: targetBatteryPercent,
                effectiveStartRangeKm: Math.round(effectiveStartRangeKm * 10) / 10,
                postChargeRangeKm: Math.round(postChargeRangeKm * 10) / 10,
                chargingStopRequired,
                stopsAutoAdded: plannedStops.length,
                firstStopStationId: firstChargingStop?._id || null,
                firstStopStationName: firstChargingStop?.name || null,
                firstStopDistanceFromOriginKm: firstChargingStop
                    ? Math.round(firstChargingStop.distanceFromStartKm * 10) / 10
                    : null,
                note: batteryAnalysisNote,
            },
            safety: {
                vehicleRangeKm,
                planningRangeKm: Math.round(safeRangeKm * 10) / 10,
                canReachDestination,
                note: canReachDestination
                    ? chargingStopRequired
                        ? "Route can be completed with the auto-added charging stops."
                        : "Trip is within range — no charging stop required."
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
