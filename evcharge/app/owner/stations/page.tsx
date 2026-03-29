"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, MapPin, Loader2, Navigation } from "lucide-react";
import { toast } from "sonner";

interface Station { _id: string; name: string; city: string; chargerType: string; totalSlots: number; pricePerKwh: number; rating: number; isApproved: boolean; }

export default function OwnerStationsPage() {
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: "", city: "", chargerType: "Type2", totalSlots: "", pricePerKwh: "", latitude: "", longitude: "" });
    const [geoLoading, setGeoLoading] = useState(false);

    const fetchStations = async () => {
        const res = await fetch("/api/stations");
        const data = await res.json();
        setStations(data.stations || []);
        setLoading(false);
    };

    useEffect(() => {
        const run = async () => {
            await fetchStations();
        };
        void run();
    }, []);

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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/stations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: form.name, city: form.city, chargerType: form.chargerType,
                totalSlots: Number(form.totalSlots), pricePerKwh: Number(form.pricePerKwh),
                location: { latitude: Number(form.latitude), longitude: Number(form.longitude) },
            }),
        });
        const data = await res.json();
        if (!res.ok) {
            toast.error(data.error || "Failed to create station");
            return;
        }
        setDialogOpen(false);
        setForm({ name: "", city: "", chargerType: "Type2", totalSlots: "", pricePerKwh: "", latitude: "", longitude: "" });
        toast.success("Station submitted for approval");
        fetchStations();
    };

    const handleDelete = async (id: string) => {
        await fetch(`/api/stations/${id}`, { method: "DELETE" });
        fetchStations();
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold">My Stations</h1><p className="text-muted-foreground">Manage your charging stations</p></div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Station</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Register Station</DialogTitle><DialogDescription>Requires admin approval</DialogDescription></DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-3">
                            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></div>
                                <div className="space-y-2"><Label>Charger</Label><Select value={form.chargerType} onValueChange={(v) => setForm({ ...form, chargerType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Type1", "Type2", "CCS", "CHAdeMO", "Tesla"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2"><Label>Slots</Label><Input type="number" value={form.totalSlots} onChange={(e) => setForm({ ...form, totalSlots: e.target.value })} required /></div>
                                <div className="space-y-2"><Label>LKR/kWh</Label><Input type="number" step="0.01" value={form.pricePerKwh} onChange={(e) => setForm({ ...form, pricePerKwh: e.target.value })} required /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2"><Label>Lat</Label><Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} required /></div>
                                <div className="space-y-2"><Label>Lng</Label><Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} required /></div>
                            </div>
                            <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={useCurrentLocation} disabled={geoLoading}>
                                {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                                Use Current Location
                            </Button>
                            <DialogFooter><Button type="submit" className="w-full">Submit</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {stations.length === 0 ? (
                <Card><CardContent className="p-12 text-center"><Building2 className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-muted-foreground">No stations yet.</p></CardContent></Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stations.map((s) => (
                        <Card key={s._id}>
                            <div className={`h-1 ${s.isApproved ? "bg-primary" : "bg-yellow-400"}`} />
                            <CardHeader className="pb-2">
                                <div className="flex justify-between"><CardTitle className="text-base">{s.name}</CardTitle><Badge variant={s.isApproved ? "success" : "warning"}>{s.isApproved ? "Approved" : "Pending"}</Badge></div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.city}</p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div className="p-2 bg-muted/50 rounded-lg"><div className="font-semibold">{s.totalSlots}</div><div className="text-xs text-muted-foreground">Slots</div></div>
                                    <div className="p-2 bg-muted/50 rounded-lg"><div className="font-semibold">LKR {s.pricePerKwh}</div><div className="text-xs text-muted-foreground">kWh</div></div>
                                    <div className="p-2 bg-muted/50 rounded-lg"><div className="font-semibold">{s.chargerType}</div><div className="text-xs text-muted-foreground">Type</div></div>
                                </div>
                                <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDelete(s._id)}>Delete Station</Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
