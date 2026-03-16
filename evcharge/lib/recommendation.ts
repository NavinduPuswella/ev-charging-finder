import { IStation } from "@/models/Station";

interface RecommendationInput {
    userLat: number;
    userLng: number;
    vehicleRange: number;
    stations: (IStation & {
        availableSlots: number;
        totalSlotCount: number;
        totalChargingPoints?: number;
    })[];
}

interface ScoredStation {
    station: IStation & {
        availableSlots: number;
        totalSlotCount: number;
        totalChargingPoints?: number;
    };
    score: number;
    distanceKm: number;
}

function haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function getRecommendedStations(
    input: RecommendationInput,
    topN: number = 3
): ScoredStation[] {
    const { userLat, userLng, vehicleRange, stations } = input;

    const maxDistance = vehicleRange > 0 ? vehicleRange : 200;

    const scored: ScoredStation[] = stations
        .map((station) => {
            const distanceKm = haversineDistance(
                userLat,
                userLng,
                station.location.latitude,
                station.location.longitude
            );

            // Distance Score: closer = better (1.0 at 0km, 0.0 at maxDistance)
            const distanceScore = Math.max(0, 1 - distanceKm / maxDistance);

            // Availability Score: more available slots = better
            const availabilityScore =
                station.totalSlotCount > 0
                    ? station.availableSlots / station.totalSlotCount
                    : 0;

            // Vehicle Range Compatibility: can the vehicle reach this station?
            const rangeCompatibility = vehicleRange > 0
                ? Math.min(1, vehicleRange / (distanceKm * 1.2))
                : 1;

            // Station Rating: normalized to 0-1
            const ratingScore = station.rating / 5;

            // Weighted score
            const score =
                0.4 * distanceScore +
                0.3 * availabilityScore +
                0.2 * rangeCompatibility +
                0.1 * ratingScore;

            return { station, score, distanceKm };
        })
        .filter((s) => s.distanceKm <= maxDistance);

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topN);
}
