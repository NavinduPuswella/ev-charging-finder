"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search,
    MapPin,
    Zap,
    Pencil,
    Power,
    ShieldCheck,
    X,
    Plus,
    Loader2,
    Trash2,
} from "lucide-react";

interface Station {
    _id: string;
    name: string;
    city: string;
    address?: string;
    chargerType: string;
    totalSlots: number;
    totalChargingPoints?: number;
    pricePerKwh: number;
    rating: number;
    isApproved: boolean;
    status?: "AVAILABLE" | "LIMITED" | "MAINTENANCE" | "INACTIVE";
    description?: string;
    location: { latitude: number; longitude: number };
}

const emptyForm = {
    name: "",
    city: "",
    address: "",
    chargerType: "Type2",
    totalSlots: "",
    pricePerKwh: "",
    latitude: "",
    longitude: "",
    description: "",
    status: "AVAILABLE",
};

export default function StationsManagementPage() {
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        name: "",
        address: "",
        chargerType: "",
        totalChargingPoints: 0,
        pricePerKwh: 0,
        status: "AVAILABLE",
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
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

    useEffect(() => {
        fetchStations();
    }, []);

    const approved = useMemo(
        () =>
            stations
                .filter((s) => s.isApproved)
                .filter(
                    (s) =>
                        s.name.toLowerCase().includes(search.toLowerCase()) ||
                        (s.city || "").toLowerCase().includes(search.toLowerCase()) ||
                        (s.address || "").toLowerCase().includes(search.toLowerCase()) ||
                        s.chargerType.toLowerCase().includes(search.toLowerCase())
                ),
        [stations, search]
    );

    const toggleEnabled = async (id: string) => {
        const station = stations.find((s) => s._id === id);
        if (!station) return;
        const newApproved = !station.isApproved;
        try {
            const res = await fetch("/api/admin/stations", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stationId: id, isApproved: newApproved }),
            });
            if (res.ok) {
                setStations((prev) =>
                    prev.map((s) =>
                        s._id === id ? { ...s, isApproved: newApproved } : s
                    )
                );
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update station status");
            }
        } catch (err) {
            console.error("Failed to toggle station:", err);
            alert("Network error. Please try again.");
        }
    };

    const startEditing = (s: Station) => {
        setEditingId(s._id);
        setEditForm({
            name: s.name,
            address: s.address || "",
            chargerType: s.chargerType,
            totalChargingPoints: s.totalChargingPoints || s.totalSlots,
            pricePerKwh: s.pricePerKwh,
            status: s.status || "AVAILABLE",
        });
    };

    const saveEdit = async (id: string) => {
        try {
            await fetch(`/api/stations/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editForm.name,
                    address: editForm.address,
                    chargerType: editForm.chargerType,
                    totalChargingPoints: editForm.totalChargingPoints,
                    totalSlots: editForm.totalChargingPoints,
                    pricePerKwh: editForm.pricePerKwh,
                    status: editForm.status,
                }),
            });
            setEditingId(null);
            fetchStations();
        } catch (err) {
            console.error("Failed to save edit:", err);
        }
    };

    const cancelEdit = () => setEditingId(null);

    const deleteStation = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/stations?stationId=${deleteId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setStations((prev) => prev.filter((s) => s._id !== deleteId));
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete station");
            }
        } catch (err) {
            console.error("Failed to delete station:", err);
            alert("Network error. Please try again.");
        } finally {
            setDeleting(false);
            setDeleteId(null);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/stations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    city: form.city,
                    address: form.address,
                    chargerType: form.chargerType,
                    totalChargingPoints: Number(form.totalSlots),
                    totalSlots: Number(form.totalSlots),
                    pricePerKwh: Number(form.pricePerKwh),
                    status: form.status,
                    location: {
                        latitude: Number(form.latitude),
                        longitude: Number(form.longitude),
                    },
                    description: form.description || undefined,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setDialogOpen(false);
                setForm(emptyForm);
                fetchStations();
            } else {
                alert(data.error || "Failed to create station");
            }
        } catch (err) {
            console.error("Failed to create station:", err);
            alert("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const stationToDelete = stations.find((s) => s._id === deleteId);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Station</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to permanently delete{" "}
                            <span className="font-semibold">{stationToDelete?.name}</span>? This will also remove all associated slots and reviews and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={deleteStation} disabled={deleting}>
                            {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting…</> : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Stations Management
                    </h1>
                    <p className="text-muted-foreground">
                        Manage approved EV charging stations in the Colombo district
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Add Station
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Add New Charging Station</DialogTitle>
                            <DialogDescription>
                                Station will be auto-approved by admin
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Station Name</Label>
                                <Input
                                    placeholder="e.g. GreenCharge Hub"
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm({ ...form, name: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input
                                        placeholder="e.g. Colombo"
                                        value={form.city}
                                        onChange={(e) =>
                                            setForm({ ...form, city: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Charger Type</Label>
                                    <Select
                                        value={form.chargerType}
                                        onValueChange={(v) =>
                                            setForm({ ...form, chargerType: v })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[
                                                "Type1",
                                                "Type2",
                                                "CCS",
                                                "CHAdeMO",
                                                "Tesla",
                                            ].map((t) => (
                                                <SelectItem key={t} value={t}>
                                                    {t}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Address</Label>
                                <Input
                                    placeholder="e.g. 12 York St, Colombo 01"
                                    value={form.address}
                                    onChange={(e) =>
                                        setForm({ ...form, address: e.target.value })
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Total Charging Points</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 4"
                                        value={form.totalSlots}
                                        onChange={(e) =>
                                            setForm({ ...form, totalSlots: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Price/kWh (LKR)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="e.g. 65"
                                        value={form.pricePerKwh}
                                        onChange={(e) =>
                                            setForm({ ...form, pricePerKwh: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={form.status}
                                        onValueChange={(v) =>
                                            setForm({ ...form, status: v })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
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
                                <div className="space-y-2">
                                    <Label>Latitude</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        placeholder="e.g. 6.9271"
                                        value={form.latitude}
                                        onChange={(e) =>
                                            setForm({ ...form, latitude: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Longitude</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        placeholder="e.g. 79.8612"
                                        value={form.longitude}
                                        onChange={(e) =>
                                            setForm({ ...form, longitude: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>
                                    Description{" "}
                                    <span className="text-muted-foreground text-xs">
                                        (optional)
                                    </span>
                                </Label>
                                <Input
                                    placeholder="Brief description of the station"
                                    value={form.description}
                                    onChange={(e) =>
                                        setForm({ ...form, description: e.target.value })
                                    }
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Creating…
                                        </>
                                    ) : (
                                        "Add Station"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by station name, city, or charger type…"
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            {approved.length === 0 ? (
                <Card className="border-0 shadow-md">
                    <CardContent className="p-12 text-center">
                        <ShieldCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">
                            No approved stations found.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-0 shadow-md overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead>Station Name</TableHead>
                                <TableHead>Address / City</TableHead>
                                <TableHead>Charger Type</TableHead>
                                <TableHead className="text-right">Charging Points</TableHead>
                                <TableHead className="text-right">
                                    Price (LKR/kWh)
                                </TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {approved.map((s) => (
                                <TableRow key={s._id}>
                                    <TableCell>
                                        {editingId === s._id ? (
                                            <Input
                                                value={editForm.name}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        name: e.target.value,
                                                    })
                                                }
                                                className="h-8 text-sm"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                    <Zap className="h-4 w-4" />
                                                </div>
                                                <span className="font-medium">
                                                    {s.name}
                                                </span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === s._id ? (
                                            <Input
                                                value={editForm.address}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        address: e.target.value,
                                                    })
                                                }
                                                className="h-8 text-sm"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                {s.address || s.city}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === s._id ? (
                                            <select
                                                value={editForm.chargerType}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        chargerType: e.target.value,
                                                    })
                                                }
                                                className="h-8 text-sm rounded border border-input bg-background px-2"
                                            >
                                                <option value="Type1">Type1</option>
                                                <option value="Type2">Type2</option>
                                                <option value="CCS">CCS</option>
                                                <option value="CHAdeMO">CHAdeMO</option>
                                                <option value="Tesla">Tesla</option>
                                            </select>
                                        ) : (
                                            <Badge variant="secondary">
                                                {s.chargerType}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingId === s._id ? (
                                            <Input
                                                type="number"
                                                min="1"
                                                value={editForm.totalChargingPoints}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        totalChargingPoints: Number(e.target.value),
                                                    })
                                                }
                                                className="h-8 text-sm w-20 ml-auto"
                                            />
                                        ) : (
                                            <span className="font-semibold">
                                                {s.totalChargingPoints || s.totalSlots}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingId === s._id ? (
                                            <Input
                                                type="number"
                                                value={editForm.pricePerKwh}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        pricePerKwh: Number(e.target.value),
                                                    })
                                                }
                                                className="h-8 text-sm w-20 ml-auto"
                                            />
                                        ) : (
                                            <span className="font-semibold">
                                                LKR {s.pricePerKwh}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={s.isApproved ? "success" : "destructive"}>
                                            {s.isApproved ? (s.status || "AVAILABLE") : "Disabled"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {editingId === s._id ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        onClick={() => saveEdit(s._id)}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-1"
                                                        onClick={cancelEdit}
                                                    >
                                                        <X className="h-3.5 w-3.5" /> Cancel
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-1"
                                                        onClick={() => startEditing(s)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />{" "}
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={s.isApproved ? "destructive" : "default"}
                                                        className="gap-1"
                                                        onClick={() => toggleEnabled(s._id)}
                                                    >
                                                        <Power className="h-3.5 w-3.5" />
                                                        {s.isApproved ? "Disable" : "Enable"}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="gap-1"
                                                        onClick={() => setDeleteId(s._id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                                    </Button>
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
