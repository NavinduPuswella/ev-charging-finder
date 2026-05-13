"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    CheckCircle2,
    Clock,
    Inbox,
    Loader2,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Search,
    User as UserIcon,
    X,
    XCircle,
    Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
    DESCRIPTION_PLACEHOLDER,
    DESCRIPTION_WORD_ERROR,
    MAX_DESCRIPTION_WORDS,
    countWords,
    sanitizeDescription,
} from "@/lib/station-description";

const CHARGER_TYPES = ["Type1", "Type2", "CCS", "CHAdeMO", "Tesla"] as const;

interface Owner {
    _id: string;
    name?: string;
    email?: string;
}

interface Submission {
    _id: string;
    name: string;
    city: string;
    address?: string;
    chargerType: string | string[];
    totalSlots: number;
    totalChargingPoints?: number;
    pricePerKwh: number;
    reservationFeePerHour?: number;
    status?: "AVAILABLE" | "LIMITED" | "MAINTENANCE" | "INACTIVE";
    description?: string;
    contactPhone?: string;
    submitterName?: string;
    submitterEmail?: string;
    isApproved: boolean;
    location: { latitude: number; longitude: number };
    ownerId?: Owner | string | null;
    createdAt?: string;
}

const normalizeChargerTypes = (value: string | string[] | undefined): string[] => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== "string" || !value.trim()) return [];
    return value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
};

const formatRelative = (iso?: string) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d ago`;
    return new Date(iso).toLocaleDateString();
};

const getOwner = (ownerId: Owner | string | undefined | null): Owner | null => {
    if (!ownerId) return null;
    if (typeof ownerId === "string") return { _id: ownerId };
    return ownerId;
};

interface DisplayContact {
    name: string;
    email?: string;
    phone?: string;
    isGuest: boolean;
}

const getDisplayContact = (s: Submission): DisplayContact => {
    const owner = getOwner(s.ownerId);
    if (owner && (owner.name || owner.email)) {
        return {
            name: owner.name || "Account user",
            email: owner.email,
            phone: s.contactPhone,
            isGuest: false,
        };
    }
    return {
        name: s.submitterName || "Guest submitter",
        email: s.submitterEmail,
        phone: s.contactPhone,
        isGuest: true,
    };
};

interface EditState {
    name: string;
    city: string;
    address: string;
    chargerType: string[];
    totalChargingPoints: number;
    pricePerKwh: number;
    reservationFeePerHour: number;
    status: "AVAILABLE" | "LIMITED" | "MAINTENANCE" | "INACTIVE";
    description: string;
    contactPhone: string;
    latitude: number;
    longitude: number;
}

const toEditState = (s: Submission): EditState => ({
    name: s.name,
    city: s.city,
    address: s.address || "",
    chargerType: normalizeChargerTypes(s.chargerType),
    totalChargingPoints: s.totalChargingPoints || s.totalSlots,
    pricePerKwh: s.pricePerKwh,
    reservationFeePerHour: s.reservationFeePerHour ?? 100,
    status: s.status || "AVAILABLE",
    description: s.description || "",
    contactPhone: s.contactPhone || "",
    latitude: s.location.latitude,
    longitude: s.location.longitude,
});

export default function AdminSubmissionsPage() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [actingId, setActingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditState | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState(false);

    const fetchSubmissions = async () => {
        try {
            const res = await fetch("/api/admin/stations");
            const data = await res.json();
            setSubmissions(data.stations || []);
        } catch (err) {
            console.error("Failed to fetch submissions:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const pending = useMemo(() => {
        const term = search.trim().toLowerCase();
        return submissions
            .filter((s) => !s.isApproved)
            .filter((s) => {
                if (!term) return true;
                const contact = getDisplayContact(s);
                return (
                    s.name.toLowerCase().includes(term) ||
                    (s.city || "").toLowerCase().includes(term) ||
                    (s.address || "").toLowerCase().includes(term) ||
                    contact.name.toLowerCase().includes(term) ||
                    (contact.email || "").toLowerCase().includes(term) ||
                    (contact.phone || "").toLowerCase().includes(term) ||
                    normalizeChargerTypes(s.chargerType).join(" ").toLowerCase().includes(term)
                );
            })
            .sort((a, b) => {
                const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return tb - ta;
            });
    }, [submissions, search]);

    const approve = async (id: string) => {
        setActingId(id);
        try {
            const res = await fetch("/api/admin/stations", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stationId: id, isApproved: true }),
            });
            const data = await res.json();
            if (res.ok) {
                setSubmissions((prev) => prev.filter((s) => s._id !== id));
                toast.success(data.message || "Station approved");
            } else {
                toast.error(data.error || "Failed to approve station");
            }
        } catch {
            toast.error("Network error. Please try again.");
        } finally {
            setActingId(null);
        }
    };

    const reject = async () => {
        if (!rejectId) return;
        setRejecting(true);
        try {
            const res = await fetch(`/api/admin/stations?stationId=${rejectId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (res.ok) {
                setSubmissions((prev) => prev.filter((s) => s._id !== rejectId));
                toast.success(data.message || "Submission rejected");
            } else {
                toast.error(data.error || "Failed to reject submission");
            }
        } catch {
            toast.error("Network error. Please try again.");
        } finally {
            setRejecting(false);
            setRejectId(null);
        }
    };

    const startEdit = (s: Submission) => {
        setEditingId(s._id);
        setEditForm(toEditState(s));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const toggleEditCharger = (type: string) => {
        if (!editForm) return;
        setEditForm({
            ...editForm,
            chargerType: editForm.chargerType.includes(type)
                ? editForm.chargerType.filter((t) => t !== type)
                : [...editForm.chargerType, type],
        });
    };

    const saveEdit = async (approveAfter: boolean) => {
        if (!editingId || !editForm) return;
        if (editForm.chargerType.length === 0) {
            toast.error("Select at least one charger type");
            return;
        }
        if (!Number.isFinite(editForm.totalChargingPoints) || editForm.totalChargingPoints < 1) {
            toast.error("Total charging points must be at least 1");
            return;
        }
        if (!Number.isFinite(editForm.pricePerKwh) || editForm.pricePerKwh < 0) {
            toast.error("Price per kWh is invalid");
            return;
        }
        if (countWords(editForm.description) > MAX_DESCRIPTION_WORDS) {
            toast.error(DESCRIPTION_WORD_ERROR);
            return;
        }

        setSavingEdit(true);
        try {
            const res = await fetch("/api/admin/stations", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stationId: editingId,
                    name: editForm.name,
                    city: editForm.city,
                    address: editForm.address,
                    chargerType: editForm.chargerType,
                    totalChargingPoints: editForm.totalChargingPoints,
                    pricePerKwh: editForm.pricePerKwh,
                    reservationFeePerHour: editForm.reservationFeePerHour,
                    status: editForm.status,
                    description: sanitizeDescription(editForm.description),
                    contactPhone: editForm.contactPhone,
                    latitude: editForm.latitude,
                    longitude: editForm.longitude,
                    ...(approveAfter ? { isApproved: true } : {}),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to save changes");
                return;
            }
            if (approveAfter) {
                setSubmissions((prev) => prev.filter((s) => s._id !== editingId));
                toast.success("Station updated and approved");
            } else {
                setSubmissions((prev) =>
                    prev.map((s) =>
                        s._id === editingId
                            ? {
                                  ...s,
                                  ...data.station,
                                  ownerId: s.ownerId, 
                              }
                            : s
                    )
                );
                toast.success("Submission updated");
            }
            cancelEdit();
        } catch {
            toast.error("Network error. Please try again.");
        } finally {
            setSavingEdit(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const submissionToReject = submissions.find((s) => s._id === rejectId);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Station Submissions</h1>
                    <p className="text-muted-foreground">
                        Review, edit, approve, or reject incoming station listings.
                    </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
                    <Clock className="h-4 w-4" />
                    <span>
                        <span className="font-semibold">{pending.length}</span>{" "}
                        pending {pending.length === 1 ? "review" : "reviews"}
                    </span>
                </div>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by station, city, owner, charger type..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {pending.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Inbox className="mx-auto mb-3 h-12 w-12 text-muted-foreground/20" />
                        <p className="font-medium text-muted-foreground">
                            No pending submissions. You&apos;re all caught up.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {pending.map((s) => {
                        const contact = getDisplayContact(s);
                        const types = normalizeChargerTypes(s.chargerType);
                        return (
                            <Card
                                key={s._id}
                                className="overflow-hidden border border-amber-100 shadow-sm"
                            >
                                <div className="h-1 bg-amber-400" />
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <CardTitle className="truncate text-base">
                                                {s.name}
                                            </CardTitle>
                                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                <span className="truncate">
                                                    {s.address || s.city}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <Badge variant="warning">
                                                <Clock className="mr-1 h-3 w-3" />
                                                Pending
                                            </Badge>
                                            {contact.isGuest ? (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    Guest
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-wrap gap-1.5">
                                        {types.map((t) => (
                                            <Badge
                                                key={t}
                                                variant="secondary"
                                                className="text-xs font-normal"
                                            >
                                                {t}
                                            </Badge>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-lg bg-muted/40 p-2.5">
                                            <div className="text-lg font-bold">
                                                {s.totalChargingPoints || s.totalSlots}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                Charging points
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-muted/40 p-2.5">
                                            <div className="text-lg font-bold">
                                                LKR {s.pricePerKwh}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                Rate / kWh
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-muted/40 p-2.5">
                                            <div className="text-lg font-bold">
                                                LKR {s.reservationFeePerHour ?? 100}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                Fee / hour
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
                                        <div className="flex items-center gap-2 font-medium text-foreground">
                                            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="truncate">{contact.name}</span>
                                            {contact.isGuest ? (
                                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                                    No account
                                                </span>
                                            ) : null}
                                        </div>
                                        {contact.email ? (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Mail className="h-3.5 w-3.5" />
                                                <a
                                                    href={`mailto:${contact.email}`}
                                                    className="truncate hover:text-primary"
                                                >
                                                    {contact.email}
                                                </a>
                                            </div>
                                        ) : null}
                                        {contact.phone ? (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Phone className="h-3.5 w-3.5" />
                                                <a
                                                    href={`tel:${contact.phone}`}
                                                    className="truncate hover:text-primary"
                                                >
                                                    {contact.phone}
                                                </a>
                                            </div>
                                        ) : null}
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="h-3.5 w-3.5" />
                                            <span className="truncate">
                                                {s.location.latitude.toFixed(4)},{" "}
                                                {s.location.longitude.toFixed(4)}
                                            </span>
                                        </div>
                                        {s.createdAt ? (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Clock className="h-3.5 w-3.5" />
                                                Submitted {formatRelative(s.createdAt)}
                                            </div>
                                        ) : null}
                                    </div>

                                    {s.description ? (
                                        <p
                                            className="line-clamp-3 text-xs leading-relaxed text-muted-foreground"
                                            style={{
                                                wordBreak: "break-word",
                                                overflowWrap: "anywhere",
                                                whiteSpace: "pre-wrap",
                                            }}
                                            title={s.description}
                                        >
                                            {s.description}
                                        </p>
                                    ) : null}

                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1"
                                            onClick={() => startEdit(s)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="gap-1"
                                            onClick={() => setRejectId(s._id)}
                                        >
                                            <XCircle className="h-3.5 w-3.5" />
                                            Reject
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="gap-1"
                                            onClick={() => approve(s._id)}
                                            disabled={actingId === s._id}
                                        >
                                            {actingId === s._id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            )}
                                            Approve
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            
            <Dialog
                open={!!editingId && !!editForm}
                onOpenChange={(open) => {
                    if (!open) cancelEdit();
                }}
            >
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Submission</DialogTitle>
                        <DialogDescription>
                            Make any corrections to the owner&apos;s submission. You can save the
                            edits or save and approve in one step.
                        </DialogDescription>
                    </DialogHeader>
                    {editForm ? (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label>Station Name</Label>
                                <Input
                                    value={editForm.name}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, name: e.target.value })
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>City</Label>
                                    <Input
                                        value={editForm.city}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, city: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Status</Label>
                                    <Select
                                        value={editForm.status}
                                        onValueChange={(v) =>
                                            setEditForm({
                                                ...editForm,
                                                status: v as EditState["status"],
                                            })
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
                            <div className="space-y-1.5">
                                <Label>Address</Label>
                                <Input
                                    value={editForm.address}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, address: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Charger Type(s)</Label>
                                <div className="grid grid-cols-2 gap-2 rounded-md border border-input p-2 sm:grid-cols-5">
                                    {CHARGER_TYPES.map((type) => (
                                        <label
                                            key={type}
                                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/40"
                                        >
                                            <input
                                                type="checkbox"
                                                className="h-3.5 w-3.5 accent-primary"
                                                checked={editForm.chargerType.includes(type)}
                                                onChange={() => toggleEditCharger(type)}
                                            />
                                            {type}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Total Charging Points</Label>
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
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Charging Rate (LKR / kWh)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editForm.pricePerKwh}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                pricePerKwh: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Reservation Fee Per Hour (LKR)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={editForm.reservationFeePerHour}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                reservationFeePerHour: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Latitude</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={editForm.latitude}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                latitude: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Longitude</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={editForm.longitude}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                longitude: Number(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Contact Phone</Label>
                                <Input
                                    value={editForm.contactPhone}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            contactPhone: e.target.value,
                                        })
                                    }
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Label htmlFor="submission-description">Description</Label>
                                    {(() => {
                                        const w = countWords(editForm.description);
                                        const over = w > MAX_DESCRIPTION_WORDS;
                                        return (
                                            <span
                                                className={`text-[11px] font-medium tabular-nums ${
                                                    over ? "text-red-600" : "text-muted-foreground"
                                                }`}
                                                aria-live="polite"
                                            >
                                                {w} / {MAX_DESCRIPTION_WORDS} words
                                            </span>
                                        );
                                    })()}
                                </div>
                                <Textarea
                                    id="submission-description"
                                    rows={4}
                                    value={editForm.description}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder={DESCRIPTION_PLACEHOLDER}
                                    className={`min-h-[120px] w-full max-w-full resize-y rounded-lg text-sm leading-relaxed ${
                                        countWords(editForm.description) > MAX_DESCRIPTION_WORDS
                                            ? "border-red-400 focus-visible:ring-red-400"
                                            : ""
                                    }`}
                                    style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                                    aria-invalid={countWords(editForm.description) > MAX_DESCRIPTION_WORDS}
                                />
                                {countWords(editForm.description) > MAX_DESCRIPTION_WORDS ? (
                                    <p className="text-xs font-medium text-red-600">
                                        {DESCRIPTION_WORD_ERROR}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                    <DialogFooter className="gap-2 sm:justify-between">
                        <Button
                            variant="outline"
                            onClick={cancelEdit}
                            disabled={savingEdit}
                            className="gap-1"
                        >
                            <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => saveEdit(false)}
                                disabled={
                                    savingEdit ||
                                    (!!editForm &&
                                        countWords(editForm.description) > MAX_DESCRIPTION_WORDS)
                                }
                            >
                                {savingEdit ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Save changes"
                                )}
                            </Button>
                            <Button
                                onClick={() => saveEdit(true)}
                                disabled={
                                    savingEdit ||
                                    (!!editForm &&
                                        countWords(editForm.description) > MAX_DESCRIPTION_WORDS)
                                }
                                className="gap-1"
                            >
                                {savingEdit ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                )}
                                Save & approve
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            
            <Dialog
                open={!!rejectId}
                onOpenChange={(open) => {
                    if (!open && !rejecting) setRejectId(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject submission?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete the submission for{" "}
                            <span className="font-semibold">{submissionToReject?.name}</span>.
                            The owner will need to resubmit if they want it listed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setRejectId(null)}
                            disabled={rejecting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={reject}
                            disabled={rejecting}
                            className="gap-1"
                        >
                            {rejecting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Rejecting...
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4" /> Reject submission
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            
            {pending.length > 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            Approving an account submission promotes the user to station
                            owner. Guest submissions are kept admin-managed until you assign
                            an owner.
                        </span>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}
