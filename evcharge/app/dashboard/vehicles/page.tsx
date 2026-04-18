"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Car, Plus, Trash2, Battery, Gauge, Zap } from "lucide-react";
import {
    CONNECTOR_TYPES,
    getModelLabel,
    searchEvModels,
    VEHICLE_TYPE_FALLBACK_CONFIG,
    VEHICLE_TYPES,
    type VehicleType,
} from "@/lib/ev-config";
import { validateVehicleInput } from "@/lib/vehicle-validation";

interface Vehicle {
    _id: string;
    brand?: string;
    model: string;
    vehicleType?: string;
    batteryCapacity: number;
    rangeKm: number;
    chargingType: string;
    supportedConnectors?: string[];
    chargingSpeedKw?: number;
}

interface VehicleFormState {
    selectedModelId: string | null;
    brand: string;
    model: string;
    vehicleType: VehicleType;
    batteryCapacity: string;
    rangeKm: string;
    chargingType: string;
    chargingSpeedKw: string;
}

const DEFAULT_FORM: VehicleFormState = {
    selectedModelId: null,
    brand: "",
    model: "",
    vehicleType: "Hatchback EV",
    batteryCapacity: "",
    rangeKm: "",
    chargingType: "Type2",
    chargingSpeedKw: "",
};

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<VehicleFormState>(DEFAULT_FORM);
    const [modelSearch, setModelSearch] = useState("");
    const [modelSearchFocused, setModelSearchFocused] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const fetchVehicles = async () => {
        const res = await fetch("/api/vehicles");
        const data = await res.json();
        setVehicles(data.vehicles || []);
        setLoading(false);
    };

    useEffect(() => {
        let isMounted = true;
        void fetch("/api/vehicles")
            .then((res) => res.json())
            .then((data) => {
                if (!isMounted) return;
                setVehicles(data.vehicles || []);
                setLoading(false);
            })
            .catch(() => {
                if (!isMounted) return;
                setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredModels = useMemo(() => searchEvModels(modelSearch, 10), [modelSearch]);

    const validation = useMemo(() => {
        const battery = form.batteryCapacity.trim() === "" ? undefined : Number(form.batteryCapacity);
        const range = form.rangeKm.trim() === "" ? undefined : Number(form.rangeKm);
        const chargingSpeed = form.chargingSpeedKw.trim() === "" ? undefined : Number(form.chargingSpeedKw);

        return validateVehicleInput({
            selectedModelId: form.selectedModelId,
            brand: form.brand,
            model: form.model,
            vehicleType: form.vehicleType,
            batteryCapacity: battery,
            rangeKm: range,
            chargingType: form.chargingType,
            chargingSpeedKw: chargingSpeed,
        });
    }, [form]);

    const allowedConnectors = useMemo(() => {
        if (validation.selectedModel) return validation.selectedModel.supportedConnectors;
        return VEHICLE_TYPE_FALLBACK_CONFIG[form.vehicleType].supportedConnectors;
    }, [form.vehicleType, validation.selectedModel]);

    const applyKnownModel = (id: string) => {
        const selected = filteredModels.find((ev) => ev.id === id)
            ?? searchEvModels(id, 1)[0];
        if (!selected) return;

        setForm({
            selectedModelId: selected.id,
            brand: selected.brand,
            model: selected.model,
            vehicleType: selected.vehicleType,
            batteryCapacity: String(selected.batteryCapacity),
            rangeKm: String(selected.suggestedRange),
            chargingType: selected.supportedConnectors[0],
            chargingSpeedKw: selected.optionalChargingSpeed ? String(selected.optionalChargingSpeed) : "",
        });
        setModelSearch(getModelLabel(selected));
        setSubmitError(null);
    };

    const switchToCustomVehicle = () => {
        setForm((prev) => ({
            ...prev,
            selectedModelId: null,
        }));
        setSubmitError(null);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validation.isValid) {
            setSubmitError("Please fix the validation errors before submitting.");
            return;
        }

        const res = await fetch("/api/vehicles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                selectedModelId: form.selectedModelId,
                brand: form.brand,
                model: form.model,
                batteryCapacity: Number(form.batteryCapacity),
                rangeKm: Number(form.rangeKm),
                vehicleType: form.vehicleType,
                chargingType: form.chargingType,
                chargingSpeedKw:
                    form.chargingSpeedKw.trim() === "" ? undefined : Number(form.chargingSpeedKw),
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            setSubmitError(data.error || "Failed to add vehicle.");
            return;
        }

        setSubmitError(null);
        setForm(DEFAULT_FORM);
        setModelSearch("");
        setDialogOpen(false);
        fetchVehicles();
    };

    const handleDelete = async (id: string) => {
        await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
        setVehicles((prev) => prev.filter((v) => v._id !== id));
    };

    if (loading) {
        return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">My Vehicles</h1>
                    <p className="text-muted-foreground">Manage your electric vehicles</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Vehicle</Button>
                    </DialogTrigger>
                    <DialogContent className="flex h-auto max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[860px] flex-col overflow-hidden p-0 sm:max-h-[calc(100vh-2.5rem)] sm:w-[calc(100vw-2.5rem)] md:w-[min(92vw,860px)]">
                        <DialogHeader className="shrink-0 border-b px-4 pb-4 pt-5 text-left sm:px-6 sm:pt-6">
                            <DialogTitle>Add New Vehicle</DialogTitle>
                            <DialogDescription>Search a known EV model or add a custom vehicle manually.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAdd} className="flex min-h-0 flex-1 flex-col">
                            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                            <div className="space-y-2 rounded-lg border border-primary/15 bg-primary/5 p-3 sm:p-4">
                                <Label>Search EV Model</Label>
                                <Input
                                    placeholder="Search BYD, Nissan Leaf, BMW, MG, Hyundai, Kia..."
                                    value={modelSearch}
                                    onFocus={() => setModelSearchFocused(true)}
                                    onBlur={() => setTimeout(() => setModelSearchFocused(false), 150)}
                                    onChange={(e) => setModelSearch(e.target.value)}
                                />
                                {(modelSearchFocused || modelSearch.trim()) && (
                                    <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-md border bg-background p-1">
                                        {filteredModels.length > 0 ? (
                                            filteredModels.map((ev) => (
                                                <button
                                                    key={ev.id}
                                                    type="button"
                                                    className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors"
                                                    onMouseDown={(event) => {
                                                        event.preventDefault();
                                                        applyKnownModel(ev.id);
                                                        setModelSearchFocused(false);
                                                    }}
                                                >
                                                    <div className="min-w-0">
                                                        <span className="font-medium">{getModelLabel(ev)}</span>
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            {ev.batteryCapacity} kWh · {ev.suggestedRange} km
                                                        </span>
                                                    </div>
                                                    <span className="shrink-0 text-[11px] text-muted-foreground">{ev.vehicleType}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-4 text-center">
                                                <p className="text-sm font-medium text-muted-foreground">No matching EV model found.</p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">Use &quot;Custom Vehicle&quot; below to add manually.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        Select a known model for smart autofill and strict model-based validation.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={switchToCustomVehicle}
                                    >
                                        Use Custom Vehicle
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Vehicle Brand</Label>
                                    <Input
                                        placeholder="e.g. Tesla"
                                        value={form.brand}
                                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                                        required
                                    />
                                    {validation.errors.brand && <p className="text-xs text-destructive">{validation.errors.brand}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Vehicle Model</Label>
                                    <Input
                                        placeholder="e.g. Model 3"
                                        value={form.model}
                                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                                        required
                                    />
                                    {validation.errors.model && <p className="text-xs text-destructive">{validation.errors.model}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Vehicle Type</Label>
                                <Select value={form.vehicleType} onValueChange={(value) => setForm({ ...form, vehicleType: value as VehicleType })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {VEHICLE_TYPES.map((vehicleType) => (
                                            <SelectItem key={vehicleType} value={vehicleType}>{vehicleType}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {validation.errors.vehicleType && <p className="text-xs text-destructive">{validation.errors.vehicleType}</p>}
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Battery Capacity (kWh)</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 75"
                                        value={form.batteryCapacity}
                                        onChange={(e) => setForm({ ...form, batteryCapacity: e.target.value })}
                                        required
                                    />
                                    {validation.errors.batteryCapacity && <p className="text-xs text-destructive">{validation.errors.batteryCapacity}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Estimated Range (km)</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 400"
                                        value={form.rangeKm}
                                        onChange={(e) => setForm({ ...form, rangeKm: e.target.value })}
                                        required
                                    />
                                    {validation.helper.range && <p className="text-xs text-muted-foreground">{validation.helper.range}</p>}
                                    {validation.errors.rangeKm && <p className="text-xs text-destructive">{validation.errors.rangeKm}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Charging Type / Connector</Label>
                                    <Select value={form.chargingType} onValueChange={(v) => setForm({ ...form, chargingType: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {CONNECTOR_TYPES.map((t) => (
                                                <SelectItem key={t} value={t} disabled={!allowedConnectors.includes(t)}>
                                                    {t}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Compatible connectors: {allowedConnectors.join(", ")}
                                    </p>
                                    {validation.errors.chargingType && <p className="text-xs text-destructive">{validation.errors.chargingType}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Charging Speed (kW) (Optional)</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 120"
                                        value={form.chargingSpeedKw}
                                        onChange={(e) => setForm({ ...form, chargingSpeedKw: e.target.value })}
                                    />
                                    {validation.errors.chargingSpeedKw && <p className="text-xs text-destructive">{validation.errors.chargingSpeedKw}</p>}
                                </div>
                            </div>
                            {validation.errors.form && (
                                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                    {validation.errors.form}
                                </p>
                            )}
                            {submitError && (
                                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                    {submitError}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Validation flow: known model range rules first, vehicle-type fallback second, connector compatibility checked separately.
                            </p>
                            </div>
                            <DialogFooter className="shrink-0 border-t bg-background px-4 py-4 sm:px-6">
                                <Button type="submit" className="w-full sm:min-w-40 sm:w-auto">Add Vehicle</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {vehicles.length === 0 ? (
                <Card><CardContent className="p-12 text-center"><Car className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-1">No vehicles yet</h3><p className="text-muted-foreground">Add your first EV to get personalized recommendations.</p></CardContent></Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {vehicles.map((v) => (
                        <Card key={v._id}>
                            <div className="h-1 bg-primary" />
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Car className="h-5 w-5 text-primary" />
                                        {v.brand ? `${v.brand} ${v.model}` : v.model}
                                    </CardTitle>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v._id)} className="h-8 w-8 text-muted-foreground">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{v.vehicleType || "EV"}</span>
                                    <span>{v.supportedConnectors?.join(", ") || v.chargingType}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                                        <Battery className="h-5 w-5 text-primary mb-1" />
                                        <span className="text-lg font-bold">{v.batteryCapacity}</span>
                                        <span className="text-xs text-muted-foreground">kWh</span>
                                    </div>
                                    <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                                        <Gauge className="h-5 w-5 text-primary mb-1" />
                                        <span className="text-lg font-bold">{v.rangeKm}</span>
                                        <span className="text-xs text-muted-foreground">km</span>
                                    </div>
                                    <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                                        <Zap className="h-5 w-5 text-primary mb-1" />
                                        <span className="text-sm font-bold">{v.chargingType}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {v.chargingSpeedKw ? `${v.chargingSpeedKw} kW` : "Connector"}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
