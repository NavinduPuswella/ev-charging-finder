export interface StationFilters {
    city?: string;
    chargerType?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    availableOnly?: boolean;
}

export async function getStations(filters?: StationFilters) {
    const params = new URLSearchParams();
    if (filters?.city) params.set("city", filters.city);
    if (filters?.chargerType) params.set("chargerType", filters.chargerType);
    if (filters?.lat) params.set("lat", filters.lat.toString());
    if (filters?.lng) params.set("lng", filters.lng.toString());
    if (filters?.radius) params.set("radius", filters.radius.toString());
    if (filters?.availableOnly) params.set("availableOnly", "true");

    const res = await fetch(`/api/stations?${params}`);
    return res.json();
}

export async function getStation(id: string) {
    const res = await fetch(`/api/stations/${id}`);
    return res.json();
}

export async function createStation(data: Record<string, unknown>) {
    const res = await fetch("/api/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateStation(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/stations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteStation(id: string) {
    const res = await fetch(`/api/stations/${id}`, { method: "DELETE" });
    return res.json();
}

export async function getStationSlots(stationId: string) {
    const res = await fetch(`/api/stations/${stationId}/slots`);
    return res.json();
}

export async function createSlots(stationId: string, slots: Record<string, unknown>[]) {
    const res = await fetch(`/api/stations/${stationId}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slots),
    });
    return res.json();
}
