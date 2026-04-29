"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Search, MapPin, Zap, Pencil, Power, ShieldCheck, X, Plus, Loader2, Trash2, Navigation,
} from "lucide-react";
import { toast } from "sonner";
import {
    DESCRIPTION_PLACEHOLDER,
    DESCRIPTION_WORD_ERROR,
    MAX_DESCRIPTION_WORDS,
    countWords,
    sanitizeDescription,
} from "@/lib/station-description";

interface Station {
    _id: string;
    name: string;
    city: string;
    address?: string;
    chargerType: string | string[];
    totalSlots: number;
    totalChargingPoints?: number;
    pricePerKwh: number;
    reservationFeePerHour: number;
    rating: number;
    isApproved: boolean;
    status?: "AVAILABLE" | "LIMITED" | "MAINTENANCE" | "INACTIVE";
    description?: string;
    location: { latitude: number; longitude: number };
}

const CHARGER_TYPES = ["Type1", "Type2", "CCS", "CHAdeMO", "Tesla"] as const;

const LocationMapPicker = dynamic(() => import("@/components/location-map-picker"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[260px] items-center justify-center rounded-xl border border-border bg-muted/30">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    ),
});

const normalizeChargerTypes = (value: string | string[] | undefined) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== "string" || !value.trim()) return [];
    return value
        .split(",")
        .map((type) => type.trim())
        .filter(Boolean);
};

const formatChargerTypes = (value: string | string[]) => {
    const types = normalizeChargerTypes(value);
    return types.length > 0 ? types : ["-"];
};

const emptyForm = {
    name: "", city: "", address: "", chargerType: ["Type2"], totalSlots: "", pricePerKwh: "",
    reservationFeePerHour: "100", latitude: "", longitude: "", description: "", status: "AVAILABLE",
};

function isValidLat(lat: number) {
    return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

function isValidLng(lng: number) {
    return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export default function StationsManagementPage() {
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", address: "", chargerType: [] as string[], totalChargingPoints: 0, pricePerKwh: 0, reservationFeePerHour: 100, status: "AVAILABLE", description: "" });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchStations = async () => {
        try {
            const res = await fetch("/api/stations?all=true");
            const data = await res.json();
            setStations(data.stations || []);
        } catch (err) {
            console.error("Failed to fetch stations:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStations(); }, []);

    const createDescriptionWords = useMemo(() => countWords(form.description), [form.description]);
    const createDescriptionOver = createDescriptionWords > MAX_DESCRIPTION_WORDS;
    const editDescriptionWords = useMemo(() => countWords(editForm.description), [editForm.description]);
    const editDescriptionOver = editDescriptionWords > MAX_DESCRIPTION_WORDS;

    const approved = useMemo(
        () => stations
            .filter((s) => s.isApproved)
            .filter((s) =>
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                (s.city || "").toLowerCase().includes(search.toLowerCase()) ||
                (s.address || "").toLowerCase().includes(search.toLowerCase()) ||
                normalizeChargerTypes(s.chargerType).join(" ").toLowerCase().includes(search.toLowerCase())
            ),
        [stations, search]
    );

    const toggleEnabled = async (id: string) => {
        const station = stations.find((s) => s._id === id);
        if (!station) return;
        const willDisable = station.status !== "INACTIVE";
        const nextStatus: Station["status"] = willDisable ? "INACTIVE" : "AVAILABLE";
        try {
            const res = await fetch("/api/admin/stations", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stationId: id, status: nextStatus }),
            });
            if (res.ok) {
                setStations((prev) => prev.map((s) => s._id === id ? { ...s, status: nextStatus } : s));
                toast.success(willDisable ? "Station disabled" : "Station enabled");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to update station status");
            }
        } catch (err) {
            console.error("Failed to toggle station:", err);
            toast.error("Network error. Please try again.");
        }
    };

    const startEditing = (s: Station) => {
        setEditingId(s._id);
        setEditForm({
            name: s.name, address: s.address || "", chargerType: normalizeChargerTypes(s.chargerType),
            totalChargingPoints: s.totalChargingPoints || s.totalSlots, pricePerKwh: s.pricePerKwh,
            reservationFeePerHour: s.reservationFeePerHour ?? 100, status: s.status || "AVAILABLE",
            description: s.description || "",
        });
    };

    const saveEdit = async (id: string) => {
        if (editForm.chargerType.length === 0) {
            toast.error("Select at least one charger type");
            return;
        }
        if (countWords(editForm.description) > MAX_DESCRIPTION_WORDS) {
            toast.error(DESCRIPTION_WORD_ERROR);
            return;
        }
        try {
            const res = await fetch(`/api/stations/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editForm.name, address: editForm.address, chargerType: editForm.chargerType,
                    totalChargingPoints: editForm.totalChargingPoints, totalSlots: editForm.totalChargingPoints,
                    pricePerKwh: editForm.pricePerKwh, reservationFeePerHour: editForm.reservationFeePerHour,
                    status: editForm.status,
                    description: sanitizeDescription(editForm.description) || undefined,
                }),
            });
            if (res.ok) {
                setEditingId(null);
                fetchStations();
                toast.success("Station updated");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to save changes");
            }
        } catch (err) {
            console.error("Failed to save edit:", err);
            toast.error("Network error. Please try again.");
        }
    };

    const cancelEdit = () => setEditingId(null);

    const toggleCreateChargerType = (type: string) => {
        setForm((prev) => ({
            ...prev,
            chargerType: prev.chargerType.includes(type)
                ? prev.chargerType.filter((item) => item !== type)
                : [...prev.chargerType, type],
        }));
    };

    const toggleEditChargerType = (type: string) => {
        setEditForm((prev) => ({
            ...prev,
            chargerType: prev.chargerType.includes(type)
                ? prev.chargerType.filter((item) => item !== type)
                : [...prev.chargerType, type],
        }));
    };

    const deleteStation = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/stations?stationId=${deleteId}`, { method: "DELETE" });
            if (res.ok) {
                setStations((prev) => prev.filter((s) => s._id !== deleteId));
                toast.success("Station deleted");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete station");
            }
        } catch (err) {
            console.error("Failed to delete station:", err);
            toast.error("Network error. Please try again.");
        } finally {
            setDeleting(false);
            setDeleteId(null);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.chargerType.length === 0) {
            toast.error("Select at least one charger type");
            return;
        }
        if (countWords(form.description) > MAX_DESCRIPTION_WORDS) {
            toast.error(DESCRIPTION_WORD_ERROR);
            return;
        }
        const lat = Number(form.latitude);
        const lng = Number(form.longitude);
        if (!isValidLat(lat) || !isValidLng(lng)) {
            toast.error("Please provide valid coordinates.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch("/api/stations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name, city: form.city, address: form.address, chargerType: form.chargerType,
                    totalChargingPoints: Number(form.totalSlots), totalSlots: Number(form.totalSlots),
                    pricePerKwh: Number(form.pricePerKwh),
                    reservationFeePerHour: Number(form.reservationFeePerHour) || 100,
                    status: form.status,
                    latitude: lat,
                    longitude: lng,
                    location: { latitude: lat, longitude: lng },
                    description: sanitizeDescription(form.description) || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setDialogOpen(false);
                setForm(emptyForm);
                fetchStations();
                toast.success("Station created");
            } else {
                toast.error(data.error || "Failed to create station");
            }
        } catch (err) {
            console.error("Failed to create station:", err);
            toast.error("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const useCurrentLocation = () => {
        if (!navigator.geolocation) return;
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm((prev) => ({
                    ...prev,
                    latitude: pos.coords.latitude.toFixed(6),
                    longitude: pos.coords.longitude.toFixed(6),
                }));
                setGeoLoading(false);
            },
            () => setGeoLoading(false)
        );
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const stationToDelete = stations.find((s) => s._id === deleteId);

    return (
        <div className="space-y-6 animate-fade-in">
            <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Station</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to permanently delete <span className="font-semibold">{stationToDelete?.name}</span>? This will also remove all associated slots and reviews and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</Button>
                        <Button variant="destructive" onClick={deleteStation} disabled={deleting}>
                            {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</> : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Stations Management</h1>
                    <p className="text-muted-foreground">Manage approved EV charging stations</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Station</Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Add New Charging Station</DialogTitle>
                            <DialogDescription>Station will be auto-approved by admin</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2"><Label>Station Name</Label><Input placeholder="e.g. GreenCharge Hub" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2"><Label>City</Label><Input placeholder="e.g. Colombo" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></div>
                                <div className="space-y-2">
                                    <Label>Charger Type(s)</Label>
                                    <div className="grid grid-cols-2 gap-2 rounded-md border p-2">
                                        {CHARGER_TYPES.map((type) => (
                                            <label key={type} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 accent-primary"
                                                    checked={form.chargerType.includes(type)}
                                                    onChange={() => toggleCreateChargerType(type)}
                                                />
                                                {type}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2"><Label>Address</Label><Input placeholder="e.g. 12 York St, Colombo 01" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2"><Label>Total Charging Points</Label><Input type="number" placeholder="e.g. 4" value={form.totalSlots} onChange={(e) => setForm({ ...form, totalSlots: e.target.value })} required /></div>
                                <div className="space-y-2"><Label>Charging Rate (LKR / kWh)</Label><Input type="number" step="0.01" placeholder="e.g. 130" value={form.pricePerKwh} onChange={(e) => setForm({ ...form, pricePerKwh: e.target.value })} required /></div>
                                <div className="space-y-2"><Label>Reservation Fee Per Hour (LKR)</Label><Input type="number" min="0" placeholder="e.g. 100" value={form.reservationFeePerHour} onChange={(e) => setForm({ ...form, reservationFeePerHour: e.target.value })} required /></div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AVAILABLE">Available</SelectItem>
                                            <SelectItem value="LIMITED">Limited</SelectItem>
                                            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2"><Label>Latitude</Label><Input type="number" step="any" min="-90" max="90" placeholder="e.g. 6.9271" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} required /></div>
                                <div className="space-y-2"><Label>Longitude</Label><Input type="number" step="any" min="-180" max="180" placeholder="e.g. 79.8612" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} required /></div>
                            </div>
                            <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={useCurrentLocation} disabled={geoLoading}>
                                {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                                Use Current Location
                            </Button>
                            <LocationMapPicker
                                latitude={form.latitude}
                                longitude={form.longitude}
                                mapClassName="h-[240px]"
                                onCoordinatesChange={(latitude, longitude) =>
                                    setForm((prev) => ({ ...prev, latitude, longitude }))
                                }
                                onUseDetectedAddress={(detected) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        city: detected.city || prev.city,
                                        address: detected.address,
                                    }))
                                }
                            />
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Label htmlFor="admin-create-description">
                                        Description <span className="text-muted-foreground text-xs">(optional)</span>
                                    </Label>
                                    <span
                                        className={`text-[11px] font-medium tabular-nums ${
                                            createDescriptionOver ? "text-red-600" : "text-muted-foreground"
                                        }`}
                                        aria-live="polite"
                                    >
                                        {createDescriptionWords} / {MAX_DESCRIPTION_WORDS} words
                                    </span>
                                </div>
                                <Textarea
                                    id="admin-create-description"
                                    placeholder={DESCRIPTION_PLACEHOLDER}
                                    rows={4}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className={`min-h-[120px] w-full max-w-full resize-y rounded-lg text-sm leading-relaxed ${
                                        createDescriptionOver ? "border-red-400 focus-visible:ring-red-400" : ""
                                    }`}
                                    style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                                    aria-invalid={createDescriptionOver}
                                />
                                {createDescriptionOver ? (
                                    <p className="text-xs font-medium text-red-600">{DESCRIPTION_WORD_ERROR}</p>
                                ) : null}
                            </div>
                            <DialogFooter>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={submitting || createDescriptionOver}
                                >
                                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : "Add Station"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by station name, city, or charger type..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {approved.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <ShieldCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">No approved stations found.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead>Station Name</TableHead>
                                <TableHead>Address / City</TableHead>
                                <TableHead>Charger Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Points</TableHead>
                                <TableHead className="text-right">Charging Rate (LKR / kWh)</TableHead>
                                <TableHead className="text-right">Reservation Fee (LKR / hr)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {approved.map((s) => (
                                <TableRow key={s._id}>
                                    <TableCell>
                                        {editingId === s._id ? (
                                            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-8 text-sm" />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><Zap className="h-4 w-4" /></div>
                                                <span className="font-medium">{s.name}</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === s._id ? (
                                            <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="h-8 text-sm" />
                                        ) : (
                                            <div className="flex items-center gap-1 text-muted-foreground text-sm"><MapPin className="h-3.5 w-3.5 shrink-0" />{s.address || s.city}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === s._id ? (
                                            <div className="space-y-1 rounded border border-input bg-background p-2">
                                                {CHARGER_TYPES.map((type) => (
                                                    <label key={type} className="flex items-center gap-2 text-xs">
                                                        <input
                                                            type="checkbox"
                                                            className="h-3.5 w-3.5 accent-primary"
                                                            checked={editForm.chargerType.includes(type)}
                                                            onChange={() => toggleEditChargerType(type)}
                                                        />
                                                        {type}
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {formatChargerTypes(s.chargerType).map((type) => (
                                                    <Badge key={`${s._id}-${type}`} variant="secondary">{type}</Badge>
                                                ))}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[260px] align-top">
                                        {editingId === s._id ? (
                                            <div className="space-y-1">
                                                <Textarea
                                                    value={editForm.description}
                                                    onChange={(e) =>
                                                        setEditForm({ ...editForm, description: e.target.value })
                                                    }
                                                    className={`min-h-[88px] w-full max-w-full resize-y rounded-md text-sm ${
                                                        editDescriptionOver
                                                            ? "border-red-400 focus-visible:ring-red-400"
                                                            : ""
                                                    }`}
                                                    style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                                                    placeholder={DESCRIPTION_PLACEHOLDER}
                                                    aria-invalid={editDescriptionOver}
                                                />
                                                <div className="flex items-center justify-between gap-2 text-[10px]">
                                                    <span
                                                        className={
                                                            editDescriptionOver
                                                                ? "font-medium text-red-600"
                                                                : "text-muted-foreground"
                                                        }
                                                    >
                                                        {editDescriptionWords} / {MAX_DESCRIPTION_WORDS} words
                                                    </span>
                                                    {editDescriptionOver ? (
                                                        <span className="font-medium text-red-600">
                                                            {DESCRIPTION_WORD_ERROR}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : s.description ? (
                                            <p
                                                className="line-clamp-3 text-sm text-muted-foreground"
                                                style={{
                                                    wordBreak: "break-word",
                                                    overflowWrap: "anywhere",
                                                    whiteSpace: "pre-wrap",
                                                }}
                                                title={s.description}
                                            >
                                                {s.description}
                                            </p>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingId === s._id ? (
                                            <Input type="number" min="1" value={editForm.totalChargingPoints} onChange={(e) => setEditForm({ ...editForm, totalChargingPoints: Number(e.target.value) })} className="h-8 text-sm w-20 ml-auto" />
                                        ) : (
                                            <span className="font-semibold">{s.totalChargingPoints || s.totalSlots}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingId === s._id ? (
                                            <Input type="number" value={editForm.pricePerKwh} onChange={(e) => setEditForm({ ...editForm, pricePerKwh: Number(e.target.value) })} className="h-8 text-sm w-20 ml-auto" />
                                        ) : (
                                            <span className="font-semibold">LKR {s.pricePerKwh}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingId === s._id ? (
                                            <Input type="number" min="0" value={editForm.reservationFeePerHour} onChange={(e) => setEditForm({ ...editForm, reservationFeePerHour: Number(e.target.value) })} className="h-8 text-sm w-20 ml-auto" />
                                        ) : (
                                            <span className="font-semibold">LKR {s.reservationFeePerHour ?? 100}</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={s.status === "INACTIVE" ? "destructive" : "success"}>
                                            {s.status === "INACTIVE" ? "Closed" : (s.status || "AVAILABLE")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {editingId === s._id ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => saveEdit(s._id)}
                                                        disabled={editDescriptionOver}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="gap-1" onClick={cancelEdit}><X className="h-3.5 w-3.5" /> Cancel</Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button size="sm" variant="outline" className="gap-1" onClick={() => startEditing(s)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                                                    <Button size="sm" variant={s.status === "INACTIVE" ? "default" : "destructive"} className="gap-1" onClick={() => toggleEnabled(s._id)}>
                                                        <Power className="h-3.5 w-3.5" />{s.status === "INACTIVE" ? "Enable" : "Disable"}
                                                    </Button>
                                                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => setDeleteId(s._id)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
