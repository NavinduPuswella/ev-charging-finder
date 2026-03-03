"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Check, X, Loader2 } from "lucide-react";

interface Station {
    _id: string;
    name: string;
    city: string;
    chargerType: string;
    totalSlots: number;
    pricePerKwh: number;
    isApproved: boolean;
    ownerId: { name: string; email: string };
}

export default function AdminStationsPage() {
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStations = async () => {
        const res = await fetch("/api/admin/stations");
        const data = await res.json();
        setStations(data.stations || []);
        setLoading(false);
    };

    useEffect(() => { fetchStations(); }, []);

    const handleApproval = async (stationId: string, isApproved: boolean) => {
        await fetch("/api/admin/stations", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stationId, isApproved }),
        });
        fetchStations();
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    const pending = stations.filter((s) => !s.isApproved);
    const approved = stations.filter((s) => s.isApproved);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold">Station Management</h1>
                <p className="text-muted-foreground">Approve or reject station registrations</p>
            </div>

            {/* Pending */}
            <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="warning">{pending.length}</Badge> Pending Approval
                </h2>
                {pending.length === 0 ? (
                    <Card><CardContent className="p-6 text-center text-muted-foreground">No pending stations.</CardContent></Card>
                ) : (
                    <div className="space-y-3">
                        {pending.map((s) => (
                            <Card key={s._id} className="border-yellow-200 bg-yellow-50/30">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">{s.name}</p>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.city} · {s.chargerType} · {s.totalSlots} slots · ${s.pricePerKwh}/kWh</p>
                                        <p className="text-xs text-muted-foreground mt-1">Owner: {s.ownerId?.name} ({s.ownerId?.email})</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="gap-1" onClick={() => handleApproval(s._id, true)}>
                                            <Check className="h-4 w-4" /> Approve
                                        </Button>
                                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleApproval(s._id, false)}>
                                            <X className="h-4 w-4" /> Reject
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Approved */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Approved Stations ({approved.length})</h2>
                {approved.length === 0 ? (
                    <Card><CardContent className="p-6 text-center text-muted-foreground">No approved stations.</CardContent></Card>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {approved.map((s) => (
                            <Card key={s._id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between"><CardTitle className="text-base">{s.name}</CardTitle><Badge variant="success">Approved</Badge></div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="h-3.5 w-3.5" />{s.city}</p>
                                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                        <div className="p-1.5 bg-muted/50 rounded"><div className="font-semibold">{s.totalSlots}</div><div className="text-xs text-muted-foreground">Slots</div></div>
                                        <div className="p-1.5 bg-muted/50 rounded"><div className="font-semibold">${s.pricePerKwh}</div><div className="text-xs text-muted-foreground">kWh</div></div>
                                        <div className="p-1.5 bg-muted/50 rounded"><div className="font-semibold">{s.chargerType}</div><div className="text-xs text-muted-foreground">Type</div></div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
