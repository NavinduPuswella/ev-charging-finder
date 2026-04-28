"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, MapPin, Zap, Star, Loader2, CalendarCheck, DollarSign } from "lucide-react";

interface Station {
    _id: string;
    name: string;
    city: string;
    chargerType: string;
    totalSlots: number;
    pricePerKwh: number;
    rating: number;
    isApproved: boolean;
    location: { latitude: number; longitude: number };
}

interface Booking {
    _id: string;
    date: string;
    duration: number;
    status: string;
    amount: number;
    userId: { name: string; email: string };
    stationId: { name: string; city: string };
}

export default function OwnerDashboard() {
    const [stations, setStations] = useState<Station[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({
        name: "", city: "", chargerType: "Type2", totalSlots: "", pricePerKwh: "", latitude: "", longitude: "",
    });

    useEffect(() => {
        const fetchData = async () => {
            const [sRes, bRes] = await Promise.all([fetch("/api/stations"), fetch("/api/bookings")]);
            const sData = await sRes.json();
            const bData = await bRes.json();
            setStations(sData.stations || []);
            setBookings(bData.bookings || []);
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/stations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: form.name,
                city: form.city,
                chargerType: form.chargerType,
                totalSlots: Number(form.totalSlots),
                pricePerKwh: Number(form.pricePerKwh),
                location: { latitude: Number(form.latitude), longitude: Number(form.longitude) },
            }),
        });
        setDialogOpen(false);
        setForm({ name: "", city: "", chargerType: "Type2", totalSlots: "", pricePerKwh: "", latitude: "", longitude: "" });
        const res = await fetch("/api/stations");
        const data = await res.json();
        setStations(data.stations || []);
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const totalRevenue = bookings.filter((b) => b.status !== "CANCELLED").reduce((sum, b) => sum + b.amount, 0);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Station Owner Dashboard</h1>
                    <p className="text-muted-foreground">Manage your charging stations and bookings</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="h-4 w-4" /> Register Station</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle>Register New Station</DialogTitle><DialogDescription>Station will be pending admin approval</DialogDescription></DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2"><Label>Station Name</Label><Input placeholder="e.g. GreenCharge Hub" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2"><Label>City</Label><Input placeholder="e.g. Colombo" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></div>
                                <div className="space-y-2">
                                    <Label>Charger Type</Label>
                                    <Select value={form.chargerType} onValueChange={(v) => setForm({ ...form, chargerType: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{["Type1", "Type2", "CCS", "CHAdeMO", "Tesla"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2"><Label>Total Slots</Label><Input type="number" value={form.totalSlots} onChange={(e) => setForm({ ...form, totalSlots: e.target.value })} required /></div>
                                <div className="space-y-2"><Label>Charging Rate (LKR / kWh)</Label><Input type="number" step="0.01" placeholder="e.g. 130" value={form.pricePerKwh} onChange={(e) => setForm({ ...form, pricePerKwh: e.target.value })} required /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2"><Label>Latitude</Label><Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} required /></div>
                                <div className="space-y-2"><Label>Longitude</Label><Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} required /></div>
                            </div>
                            <DialogFooter><Button type="submit" className="w-full">Submit for Approval</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Stations</p><p className="text-3xl font-bold">{stations.length}</p></div><div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Bookings</p><p className="text-3xl font-bold">{bookings.length}</p></div><div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center"><CalendarCheck className="h-5 w-5 text-blue-500" /></div></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Revenue</p><p className="text-3xl font-bold">LKR {totalRevenue}</p></div><div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center"><DollarSign className="h-5 w-5 text-green-500" /></div></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Approved</p><p className="text-3xl font-bold">{stations.filter((s) => s.isApproved).length}</p></div><div className="h-10 w-10 rounded-lg bg-yellow-50 flex items-center justify-center"><Zap className="h-5 w-5 text-yellow-500" /></div></div></CardContent></Card>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">My Stations</h2>
                {stations.length === 0 ? (
                    <Card><CardContent className="p-8 text-center"><Building2 className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-muted-foreground">No stations yet. Register your first station.</p></CardContent></Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {stations.map((s) => (
                            <Card key={s._id}>
                                <div className={`h-1 ${s.isApproved ? "bg-primary" : "bg-yellow-400"}`} />
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-base">{s.name}</CardTitle>
                                        <Badge variant={s.isApproved ? "success" : "warning"}>{s.isApproved ? "Approved" : "Pending"}</Badge>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{s.city}</div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        <div className="text-center p-2 bg-muted/50 rounded-lg"><div className="font-semibold">{s.totalSlots}</div><div className="text-xs text-muted-foreground">Slots</div></div>
                                        <div className="text-center p-2 bg-muted/50 rounded-lg"><div className="font-semibold">LKR {s.pricePerKwh} / kWh</div><div className="text-xs text-muted-foreground">Charging Rate</div></div>
                                        <div className="text-center p-2 bg-muted/50 rounded-lg"><div className="font-semibold flex items-center justify-center gap-1"><Star className="h-3 w-3 text-yellow-500" />{s.rating.toFixed(1)}</div><div className="text-xs text-muted-foreground">Rating</div></div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">Recent Bookings</h2>
                {bookings.length === 0 ? (
                    <Card><CardContent className="p-8 text-center text-muted-foreground">No bookings yet.</CardContent></Card>
                ) : (
                    <div className="space-y-3">
                        {bookings.slice(0, 10).map((b) => (
                            <Card key={b._id}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{b.userId?.name || "User"} — {b.stationId?.name || "Station"}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(b.date).toLocaleDateString()} · {b.duration}h</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Reservation Fee</p>
                                            <p className="font-semibold text-primary">LKR {b.amount}</p>
                                        </div>
                                        <Badge variant={b.status === "CONFIRMED" ? "default" : b.status === "COMPLETED" ? "success" : "destructive"}>{b.status}</Badge>
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
