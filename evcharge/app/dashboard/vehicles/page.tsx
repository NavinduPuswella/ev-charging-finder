"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Car,
    Plus,
    Trash2,
    Battery,
    Gauge,
    Zap,
    Pencil,
    Star,
    Plug,
    Sparkles,
    CircleCheck,
} from "lucide-react";
import { toast } from "sonner";
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
    isPrimary?: boolean;
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

type TouchedFields = Partial<
    Record<
        | "brand"
        | "model"
        | "vehicleType"
        | "batteryCapacity"
        | "rangeKm"
        | "chargingType"
        | "chargingSpeedKw",
        boolean
    >
>;

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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
    const [form, setForm] = useState<VehicleFormState>(DEFAULT_FORM);
    const [touched, setTouched] = useState<TouchedFields>({});
    const [attemptedSubmit, setAttemptedSubmit] = useState(false);
    const [modelSearch, setModelSearch] = useState("");
    const [modelSearchFocused, setModelSearchFocused] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchVehicles = async () => {
        try {
            const res = await fetch("/api/vehicles");
            const data = await res.json();
            setVehicles(data.vehicles || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchVehicles();
    }, []);

    const filteredModels = useMemo(() => searchEvModels(modelSearch, 10), [modelSearch]);

    const validation = useMemo(() => {
        const battery = form.batteryCapacity.trim() === "" ? undefined : Number(form.batteryCapacity);
        const range = form.rangeKm.trim() === "" ? undefined : Number(form.rangeKm);
        const chargingSpeed =
            form.chargingSpeedKw.trim() === "" ? undefined : Number(form.chargingSpeedKw);

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

    const showError = (field: keyof TouchedFields) =>
        (touched[field] || attemptedSubmit) && validation.errors[field];

    const resetForm = () => {
        setForm(DEFAULT_FORM);
        setTouched({});
        setAttemptedSubmit(false);
        setModelSearch("");
        setSubmitError(null);
        setEditingId(null);
    };

    const openAddDialog = () => {
        resetForm();
        setDialogOpen(true);
    };

    const openEditDialog = (vehicle: Vehicle) => {
        const vehicleType = (vehicle.vehicleType as VehicleType) || "Hatchback EV";
        setForm({
            selectedModelId: null,
            brand: vehicle.brand ?? "",
            model: vehicle.model ?? "",
            vehicleType,
            batteryCapacity: String(vehicle.batteryCapacity ?? ""),
            rangeKm: String(vehicle.rangeKm ?? ""),
            chargingType: vehicle.chargingType ?? "Type2",
            chargingSpeedKw:
                vehicle.chargingSpeedKw !== undefined && vehicle.chargingSpeedKw !== null
                    ? String(vehicle.chargingSpeedKw)
                    : "",
        });
        setTouched({});
        setAttemptedSubmit(false);
        setModelSearch("");
        setSubmitError(null);
        setEditingId(vehicle._id);
        setDialogOpen(true);
    };

    const applyKnownModel = (id: string) => {
        const selected = filteredModels.find((ev) => ev.id === id) ?? searchEvModels(id, 1)[0];
        if (!selected) return;

        setForm({
            selectedModelId: selected.id,
            brand: selected.brand,
            model: selected.model,
            vehicleType: selected.vehicleType,
            batteryCapacity: String(selected.batteryCapacity),
            rangeKm: String(selected.suggestedRange),
            chargingType: selected.supportedConnectors[0],
            chargingSpeedKw: selected.optionalChargingSpeed
                ? String(selected.optionalChargingSpeed)
                : "",
        });
        setModelSearch(getModelLabel(selected));
        setSubmitError(null);
        setTouched({
            brand: true,
            model: true,
            vehicleType: true,
            batteryCapacity: true,
            rangeKm: true,
            chargingType: true,
        });
    };

    const switchToCustomVehicle = () => {
        setForm((prev) => ({ ...prev, selectedModelId: null }));
        setSubmitError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAttemptedSubmit(true);
        if (!validation.isValid) {
            setSubmitError("Please fix the highlighted fields before submitting.");
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            const payload = {
                selectedModelId: form.selectedModelId,
                brand: form.brand,
                model: form.model,
                batteryCapacity: Number(form.batteryCapacity),
                rangeKm: Number(form.rangeKm),
                vehicleType: form.vehicleType,
                chargingType: form.chargingType,
                chargingSpeedKw:
                    form.chargingSpeedKw.trim() === ""
                        ? undefined
                        : Number(form.chargingSpeedKw),
            };

            const res = await fetch(
                editingId ? `/api/vehicles/${editingId}` : "/api/vehicles",
                {
                    method: editingId ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            const data = await res.json();
            if (!res.ok) {
                setSubmitError(data.error || "Failed to save vehicle.");
                return;
            }

            toast.success(editingId ? "Vehicle updated" : "Vehicle added successfully");
            resetForm();
            setDialogOpen(false);
            await fetchVehicles();
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/vehicles/${deleteTarget._id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || "Failed to delete vehicle");
                return;
            }
            toast.success("Vehicle removed");
            setVehicles((prev) => prev.filter((v) => v._id !== deleteTarget._id));
            await fetchVehicles();
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleSetPrimary = async (vehicle: Vehicle) => {
        if (vehicle.isPrimary) return;
        try {
            const res = await fetch(`/api/vehicles/${vehicle._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPrimary: true }),
            });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || "Failed to update primary vehicle");
                return;
            }
            setVehicles((prev) =>
                prev.map((v) => ({ ...v, isPrimary: v._id === vehicle._id }))
            );
            toast.success(
                `${vehicle.brand ? `${vehicle.brand} ` : ""}${vehicle.model} is now your primary vehicle`
            );
            await fetchVehicles();
        } catch {
            toast.error("Something went wrong");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Vehicles</h1>
                    <p className="text-muted-foreground mt-0.5">
                        Manage your electric vehicles and pick a primary for trip planning
                    </p>
                </div>
                <Dialog
                    open={dialogOpen}
                    onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) resetForm();
                    }}
                >
                    <DialogTrigger asChild>
                        <Button className="gap-2" onClick={openAddDialog}>
                            <Plus className="h-4 w-4" /> Add Vehicle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="flex h-auto max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[860px] flex-col overflow-hidden p-0 sm:max-h-[calc(100vh-2.5rem)] sm:w-[calc(100vw-2.5rem)] md:w-[min(92vw,860px)]">
                        <DialogHeader className="shrink-0 border-b px-4 pb-4 pt-5 text-left sm:px-6 sm:pt-6">
                            <DialogTitle>
                                {editingId ? "Edit Vehicle" : "Add New Vehicle"}
                            </DialogTitle>
                            <DialogDescription>
                                {editingId
                                    ? "Update your vehicle details."
                                    : "Search a known EV model for smart autofill, or add a custom vehicle manually."}
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleSubmit}
                            className="flex min-h-0 flex-1 flex-col"
                        >
                            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
                                {!editingId && (
                                    <div className="space-y-2.5 rounded-xl border border-primary/15 bg-primary/5 p-3.5 sm:p-4">
                                        <div className="flex items-center gap-2">
                                           
                                            <Label className="text-sm font-semibold">
                                                Search EV Model
                                            </Label>
                                        </div>
                                        <Input
                                            placeholder="Search BYD, Nissan Leaf, BMW, MG, Hyundai, Kia..."
                                            value={modelSearch}
                                            onFocus={() => setModelSearchFocused(true)}
                                            onBlur={() =>
                                                setTimeout(() => setModelSearchFocused(false), 150)
                                            }
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
                                                                <span className="font-medium">
                                                                    {getModelLabel(ev)}
                                                                </span>
                                                                <span className="ml-2 text-xs text-muted-foreground">
                                                                    {ev.batteryCapacity} kWh ·{" "}
                                                                    {ev.suggestedRange} km
                                                                </span>
                                                            </div>
                                                            <span className="shrink-0 text-[11px] text-muted-foreground">
                                                                {ev.vehicleType}
                                                            </span>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-4 text-center">
                                                        <p className="text-sm font-medium text-muted-foreground">
                                                            No matching EV model found.
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            Use &quot;Custom Vehicle&quot; below to add
                                                            manually.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-xs text-muted-foreground">
                                                Selecting a model auto-fills specs and validates
                                                against its specs.
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
                                )}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField
                                        label="Vehicle Brand"
                                        helper="e.g. Tesla, BYD, Nissan"
                                        error={showError("brand") ? validation.errors.brand : undefined}
                                    >
                                        <Input
                                            placeholder="Tesla"
                                            value={form.brand}
                                            onBlur={() => setTouched({ ...touched, brand: true })}
                                            onChange={(e) => setForm({ ...form, brand: e.target.value })}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Vehicle Model"
                                        helper="e.g. Model 3, Leaf, EV6"
                                        error={showError("model") ? validation.errors.model : undefined}
                                    >
                                        <Input
                                            placeholder="Model 3"
                                            value={form.model}
                                            onBlur={() => setTouched({ ...touched, model: true })}
                                            onChange={(e) => setForm({ ...form, model: e.target.value })}
                                        />
                                    </FormField>
                                </div>

                                <FormField
                                    label="Vehicle Type"
                                    error={showError("vehicleType") ? validation.errors.vehicleType : undefined}
                                >
                                    <Select
                                        value={form.vehicleType}
                                        onValueChange={(value) => {
                                            setForm({ ...form, vehicleType: value as VehicleType });
                                            setTouched({ ...touched, vehicleType: true });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {VEHICLE_TYPES.map((vehicleType) => (
                                                <SelectItem key={vehicleType} value={vehicleType}>
                                                    {vehicleType}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormField>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField
                                        label="Battery Capacity (kWh)"
                                        helper="Total usable battery size"
                                        error={
                                            showError("batteryCapacity")
                                                ? validation.errors.batteryCapacity
                                                : undefined
                                        }
                                    >
                                        <Input
                                            type="number"
                                            placeholder="75"
                                            value={form.batteryCapacity}
                                            onBlur={() =>
                                                setTouched({ ...touched, batteryCapacity: true })
                                            }
                                            onChange={(e) =>
                                                setForm({ ...form, batteryCapacity: e.target.value })
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        label="Estimated Range (km)"
                                        helper={validation.helper.range}
                                        error={
                                            showError("rangeKm") ? validation.errors.rangeKm : undefined
                                        }
                                    >
                                        <Input
                                            type="number"
                                            placeholder="400"
                                            value={form.rangeKm}
                                            onBlur={() => setTouched({ ...touched, rangeKm: true })}
                                            onChange={(e) =>
                                                setForm({ ...form, rangeKm: e.target.value })
                                            }
                                        />
                                    </FormField>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField
                                        label="Connector Type"
                                        helper={`Compatible: ${allowedConnectors.join(", ")}`}
                                        error={
                                            showError("chargingType")
                                                ? validation.errors.chargingType
                                                : undefined
                                        }
                                    >
                                        <Select
                                            value={form.chargingType}
                                            onValueChange={(v) => {
                                                setForm({ ...form, chargingType: v });
                                                setTouched({ ...touched, chargingType: true });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CONNECTOR_TYPES.map((t) => (
                                                    <SelectItem
                                                        key={t}
                                                        value={t}
                                                        disabled={!allowedConnectors.includes(t)}
                                                    >
                                                        {t}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormField>
                                    <FormField
                                        label="Charging Speed (kW)"
                                        helper="Optional — peak charging rate"
                                        error={
                                            showError("chargingSpeedKw")
                                                ? validation.errors.chargingSpeedKw
                                                : undefined
                                        }
                                    >
                                        <Input
                                            type="number"
                                            placeholder="120"
                                            value={form.chargingSpeedKw}
                                            onBlur={() =>
                                                setTouched({ ...touched, chargingSpeedKw: true })
                                            }
                                            onChange={(e) =>
                                                setForm({ ...form, chargingSpeedKw: e.target.value })
                                            }
                                        />
                                    </FormField>
                                </div>

                                {validation.errors.form && attemptedSubmit && (
                                    <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                        {validation.errors.form}
                                    </p>
                                )}
                                {submitError && (
                                    <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                        {submitError}
                                    </p>
                                )}
                            </div>
                            <DialogFooter className="shrink-0 border-t bg-background px-4 py-4 sm:px-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="w-full sm:min-w-40 sm:w-auto"
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? editingId
                                            ? "Saving..."
                                            : "Adding..."
                                        : editingId
                                            ? "Save Changes"
                                            : "Add Vehicle"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {vehicles.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                            <Car className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">
                            No vehicles yet
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-sm mb-5">
                            Add your first EV to unlock personalized station
                            recommendations and smart trip planning.
                        </p>
                        <Button onClick={openAddDialog} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Your First Vehicle
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {vehicles.length === 1 && (
                        <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Tip:</span> Add a
                            second vehicle to switch between them when planning trips.
                        </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {vehicles.map((v) => (
                            <VehicleCard
                                key={v._id}
                                vehicle={v}
                                onEdit={() => openEditDialog(v)}
                                onDelete={() => setDeleteTarget(v)}
                                onSetPrimary={() => handleSetPrimary(v)}
                            />
                        ))}
                    </div>
                </>
            )}

            <Dialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete this vehicle?</DialogTitle>
                        <DialogDescription>
                            {deleteTarget?.brand ? `${deleteTarget.brand} ` : ""}
                            {deleteTarget?.model} will be permanently removed from your
                            account. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                        >
                            Keep Vehicle
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function FormField({
    label,
    helper,
    error,
    children,
}: {
    label: string;
    helper?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">{label}</Label>
            {children}
            {error ? (
                <p className="text-xs text-destructive">{error}</p>
            ) : helper ? (
                <p className="text-xs text-muted-foreground">{helper}</p>
            ) : null}
        </div>
    );
}

function VehicleCard({
    vehicle,
    onEdit,
    onDelete,
    onSetPrimary,
}: {
    vehicle: Vehicle;
    onEdit: () => void;
    onDelete: () => void;
    onSetPrimary: () => void;
}) {
    const displayName = vehicle.brand
        ? `${vehicle.brand} ${vehicle.model}`
        : vehicle.model;

    return (
        <Card
            className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md ${
                vehicle.isPrimary
                    ? "border-primary/40 shadow-sm"
                    : "hover:border-primary/20"
            }`}
        >
            <div
                className={`h-1 ${
                    vehicle.isPrimary
                        ? "bg-gradient-to-r from-primary via-primary/70 to-primary/30"
                        : "bg-primary/30"
                }`}
            />
            <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Car className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-base font-semibold truncate">
                                    {displayName}
                                </h3>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {vehicle.vehicleType || "EV"}
                            </p>
                        </div>
                    </div>
                    {vehicle.isPrimary && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            <Star className="h-3 w-3 fill-primary" /> Primary
                        </span>
                    )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                    <Stat icon={Battery} value={vehicle.batteryCapacity} unit="kWh" />
                    <Stat icon={Gauge} value={vehicle.rangeKm} unit="km" />
                    <Stat
                        icon={Zap}
                        value={
                            vehicle.chargingSpeedKw
                                ? `${vehicle.chargingSpeedKw}`
                                : "–"
                        }
                        unit={vehicle.chargingSpeedKw ? "kW" : vehicle.chargingType}
                    />
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Plug className="h-3.5 w-3.5" />
                    <span className="truncate">
                        {vehicle.supportedConnectors?.join(", ") || vehicle.chargingType}
                    </span>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={onEdit}
                    >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    {vehicle.isPrimary ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="gap-1 opacity-90"
                            disabled
                            aria-label="This is your primary vehicle for trip planning"
                        >
                            <Star className="h-3.5 w-3.5 fill-primary" /> Primary vehicle
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            onClick={onSetPrimary}
                        >
                            <CircleCheck className="h-3.5 w-3.5" /> Set Primary
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function Stat({
    icon: Icon,
    value,
    unit,
}: {
    icon: React.ElementType;
    value: string | number;
    unit: string;
}) {
    return (
        <div className="flex flex-col items-center rounded-lg border bg-muted/30 p-3">
            <Icon className="mb-1 h-4 w-4 text-primary" />
            <span className="text-base font-bold leading-tight">{value}</span>
            <span className="text-[11px] text-muted-foreground">{unit}</span>
        </div>
    );
}
