"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    CalendarCheck,
    Clock,
    Eye,
    History,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Search,
    UserRound,
    Zap,
} from "lucide-react";

const MapViewLeaflet = dynamic(() => import("@/components/map-view-leaflet"), {
    ssr: false,
    loading: () => (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-border bg-muted/30">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
    ),
});

type FilterKey = "today" | "week" | "month" | "all";
type Source = "admin" | "owner_submission" | "guest_submission";
type AccountStatus = "Registered User" | "Guest / No Account" | "Admin Added";

interface Owner {
    _id: string;
    name?: string;
    email?: string;
}

interface AddedStation {
    _id: string;
    name: string;
    city: string;
    address?: string;
    chargerType: string | string[];
    totalSlots?: number;
    totalChargingPoints?: number;
    pricePerKwh: number;
    reservationFeePerHour?: number;
    status?: "AVAILABLE" | "LIMITED" | "MAINTENANCE" | "INACTIVE";
    description?: string;
    isApproved: boolean;
    location: { latitude: number; longitude: number };
    ownerId?: Owner | string | null;
    contactPhone?: string;
    submitterName?: string;
    submitterEmail?: string;
    requesterName?: string;
    requesterEmail?: string;
    requesterPhone?: string;
    requesterUserId?: string;
    requesterAccountStatus?: AccountStatus;
    source?: Source;
    submittedAt?: string;
    approvedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All" },
];

const normalizeChargerTypes = (value: string | string[] | undefined): string[] => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== "string" || !value.trim()) return [];
    return value
        .split(",")
        .map((type) => type.trim())
        .filter(Boolean);
};

const getOwner = (ownerId: Owner | string | undefined | null): Owner | null => {
    if (!ownerId) return null;
    if (typeof ownerId === "string") return { _id: ownerId };
    return ownerId;
};

const getAddedDate = (station: AddedStation) =>
    station.approvedAt || station.createdAt || station.updatedAt;

const getDateValue = (station: AddedStation) => {
    const date = getAddedDate(station);
    if (!date) return 0;
    const value = new Date(date).getTime();
    return Number.isFinite(value) ? value : 0;
};

const startOfToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

const startOfWeek = () => {
    const date = startOfToday();
    date.setDate(date.getDate() - date.getDay());
    return date;
};

const startOfMonth = () => {
    const date = startOfToday();
    date.setDate(1);
    return date;
};

const isInDateRange = (station: AddedStation, range: FilterKey) => {
    if (range === "all") return true;
    const value = getDateValue(station);
    if (!value) return false;

    if (range === "today") return value >= startOfToday().getTime();
    if (range === "week") return value >= startOfWeek().getTime();
    return value >= startOfMonth().getTime();
};

const formatDateTime = (iso?: string) => {
    if (!iso) return "-";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatStatus = (status?: AddedStation["status"]) => {
    switch (status) {
        case "LIMITED":
            return "Limited";
        case "MAINTENANCE":
            return "Maintenance";
        case "INACTIVE":
            return "Inactive";
        default:
            return "Available";
    }
};

const inferSource = (station: AddedStation): Source => {
    if (station.source) return station.source;
    if (station.requesterAccountStatus === "Guest / No Account" || (station.submitterEmail && !station.ownerId)) {
        return "guest_submission";
    }
    if (station.ownerId || station.requesterUserId || station.requesterAccountStatus === "Registered User") {
        return "owner_submission";
    }
    return "admin";
};

const getSourceMeta = (source: Source) => {
    switch (source) {
        case "owner_submission":
            return {
                label: "Owner Submission",
                className: "border-blue-100 bg-blue-50 text-blue-700",
            };
        case "guest_submission":
            return {
                label: "Guest Submission",
                className: "border-amber-100 bg-amber-50 text-amber-700",
            };
        default:
            return {
                label: "Admin",
                className: "border-emerald-100 bg-emerald-50 text-emerald-700",
            };
    }
};

const getAccountStatus = (station: AddedStation): AccountStatus => {
    if (station.requesterAccountStatus) return station.requesterAccountStatus;
    const source = inferSource(station);
    if (source === "admin") return "Admin Added";
    if (source === "guest_submission") return "Guest / No Account";
    return "Registered User";
};

const getAccountBadgeClass = (status: AccountStatus) => {
    if (status === "Registered User") return "border-blue-100 bg-blue-50 text-blue-700";
    if (status === "Guest / No Account") return "border-amber-100 bg-amber-50 text-amber-700";
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
};

const getRequester = (station: AddedStation) => {
    const owner = getOwner(station.ownerId);
    const source = inferSource(station);
    return {
        name:
            station.requesterName ||
            station.submitterName ||
            owner?.name ||
            (source === "admin" ? "ChargeX Admin" : "Unknown requester"),
        email:
            station.requesterEmail ||
            station.submitterEmail ||
            owner?.email ||
            (source === "admin" ? "Admin added station" : "-"),
        phone: station.requesterPhone || station.contactPhone || "-",
        userId: station.requesterUserId || owner?._id,
    };
};

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-foreground">{value || "-"}</p>
    </div>
);

export default function AddedStationsPage() {
    const [stations, setStations] = useState<AddedStation[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterKey>("month");
    const [selected, setSelected] = useState<AddedStation | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/admin/stations")
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) setStations(data.stations || []);
            })
            .catch(() => {
                if (!cancelled) setStations([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const approvedStations = useMemo(
        () =>
            stations
                .filter((station) => station.isApproved)
                .sort((a, b) => getDateValue(b) - getDateValue(a)),
        [stations]
    );

    const summaries = useMemo(
        () => [
            {
                label: "Added Today",
                value: approvedStations.filter((station) => isInDateRange(station, "today")).length,
                icon: CalendarCheck,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
            },
            {
                label: "Added This Week",
                value: approvedStations.filter((station) => isInDateRange(station, "week")).length,
                icon: Clock,
                color: "text-blue-600",
                bg: "bg-blue-50",
            },
            {
                label: "Added This Month",
                value: approvedStations.filter((station) => isInDateRange(station, "month")).length,
                icon: History,
                color: "text-violet-600",
                bg: "bg-violet-50",
            },
            {
                label: "Total Added Stations",
                value: approvedStations.length,
                icon: Zap,
                color: "text-amber-600",
                bg: "bg-amber-50",
            },
        ],
        [approvedStations]
    );

    const filteredStations = useMemo(() => {
        const term = search.trim().toLowerCase();
        return approvedStations
            .filter((station) => isInDateRange(station, filter))
            .filter((station) => {
                if (!term) return true;
                const requester = getRequester(station);
                const searchable = [
                    station.name,
                    station.city,
                    station.address,
                    requester.name,
                    requester.email,
                    requester.phone,
                    ...normalizeChargerTypes(station.chargerType),
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return searchable.includes(term);
            });
    }, [approvedStations, filter, search]);

    const selectedRequester = selected ? getRequester(selected) : null;
    const selectedSource = selected ? inferSource(selected) : "admin";
    const selectedSourceMeta = getSourceMeta(selectedSource);
    const selectedAccountStatus = selected ? getAccountStatus(selected) : "Admin Added";

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Added Station Details</DialogTitle>
                        <DialogDescription>
                            Full station, requester, approval, and source information.
                        </DialogDescription>
                    </DialogHeader>

                    {selected && selectedRequester ? (
                        <div className="space-y-6">
                            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-foreground">Station Details</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Approved station information shown in ChargeX.
                                        </p>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <DetailItem label="Station Name" value={selected.name} />
                                        <DetailItem label="City" value={selected.city} />
                                        <DetailItem label="Address" value={selected.address} />
                                        <DetailItem label="Charger Types" value={normalizeChargerTypes(selected.chargerType).join(", ")} />
                                        <DetailItem label="Total Charging Points" value={selected.totalChargingPoints || selected.totalSlots} />
                                        <DetailItem label="Charging Rate Per kWh" value={`LKR ${selected.pricePerKwh}`} />
                                        <DetailItem label="Reservation Fee Per Hour" value={`LKR ${selected.reservationFeePerHour ?? 100}`} />
                                        <DetailItem label="Status" value={formatStatus(selected.status)} />
                                        <DetailItem label="Latitude" value={selected.location?.latitude} />
                                        <DetailItem label="Longitude" value={selected.location?.longitude} />
                                        <div className="sm:col-span-2">
                                            <DetailItem label="Description" value={selected.description || "-"} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-foreground">Requester Details</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Preserved submitter and approval metadata.
                                        </p>
                                    </div>
                                    <div className="grid gap-3">
                                        <DetailItem label="Requester Name" value={selectedRequester.name} />
                                        <DetailItem label="Requester Email" value={selectedRequester.email} />
                                        <DetailItem label="Requester Phone" value={selectedRequester.phone} />
                                        <DetailItem label="Account Status" value={selectedAccountStatus} />
                                        <DetailItem label="Requester User ID" value={selectedRequester.userId} />
                                        <DetailItem label="Source" value={selectedSourceMeta.label} />
                                        <DetailItem label="Submitted Date" value={formatDateTime(selected.submittedAt)} />
                                        <DetailItem label="Approved Date" value={formatDateTime(getAddedDate(selected))} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-foreground">Map Preview</h3>
                                <MapViewLeaflet
                                    className="min-h-[260px]"
                                    highlightedStationIds={[selected._id]}
                                    stations={[
                                        {
                                            _id: selected._id,
                                            name: selected.name,
                                            city: selected.city,
                                            location: selected.location,
                                            availabilityStatus:
                                                selected.status === "INACTIVE" || selected.status === "MAINTENANCE"
                                                    ? "Closed"
                                                    : "Available",
                                        },
                                    ]}
                                />
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Added Stations</h1>
                    <p className="text-muted-foreground">
                        View approved charging stations and requester details
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((option) => (
                        <Button
                            key={option.key}
                            type="button"
                            size="sm"
                            variant={filter === option.key ? "default" : "outline"}
                            className={
                                filter === option.key
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : "bg-background"
                            }
                            onClick={() => setFilter(option.key)}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaries.map(({ label, value, icon: Icon, color, bg }) => (
                    <Card key={label} className="border border-border/70">
                        <CardContent className="flex items-center justify-between p-5">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                                <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
                            </div>
                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg} ${color}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="relative max-w-2xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by station, city, requester, email, or charger type..."
                    className="pl-10"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
            </div>

            {filteredStations.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <History className="mx-auto mb-3 h-12 w-12 text-muted-foreground/20" />
                        <p className="font-medium text-muted-foreground">No added stations match your filters.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[1380px]">
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead>Station Name</TableHead>
                                    <TableHead>Address / City</TableHead>
                                    <TableHead>Requester</TableHead>
                                    <TableHead>Account Status</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Charger Type</TableHead>
                                    <TableHead className="text-right">Points</TableHead>
                                    <TableHead className="text-right">Charging Rate</TableHead>
                                    <TableHead className="text-right">Reservation Fee</TableHead>
                                    <TableHead>Approved Date</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStations.map((station) => {
                                    const requester = getRequester(station);
                                    const accountStatus = getAccountStatus(station);
                                    const sourceMeta = getSourceMeta(inferSource(station));
                                    return (
                                        <TableRow key={station._id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                                        <Zap className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{station.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatStatus(station.status)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-[220px] text-sm">
                                                    <div className="flex items-start gap-1 text-muted-foreground">
                                                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                        <span className="line-clamp-2">{station.address || station.city}</span>
                                                    </div>
                                                    {station.address ? (
                                                        <p className="mt-1 text-xs font-medium text-foreground">{station.city}</p>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-[210px]">
                                                    <div className="flex items-center gap-1.5 font-medium">
                                                        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="truncate">{requester.name}</span>
                                                    </div>
                                                    <p className="mt-1 truncate text-xs text-muted-foreground">{requester.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getAccountBadgeClass(accountStatus)}>
                                                    {accountStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="h-3.5 w-3.5" />
                                                        <span>{requester.phone}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        <span className="max-w-[180px] truncate">{requester.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex max-w-[180px] flex-wrap gap-1">
                                                    {normalizeChargerTypes(station.chargerType).map((type) => (
                                                        <Badge key={`${station._id}-${type}`} variant="secondary">
                                                            {type}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {station.totalChargingPoints || station.totalSlots || "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                LKR {station.pricePerKwh}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                LKR {station.reservationFeePerHour ?? 100}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDateTime(getAddedDate(station))}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={sourceMeta.className}>
                                                    {sourceMeta.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1.5"
                                                    onClick={() => setSelected(station)}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}
        </div>
    );
}
