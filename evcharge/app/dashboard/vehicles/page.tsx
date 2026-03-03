"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Car, Plus, Trash2, Battery, Gauge, Zap } from "lucide-react";

interface Vehicle {
    _id: string;
    model: string;
    batteryCapacity: number;
    rangeKm: number;
    chargingType: string;
}

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ model: "", batteryCapacity: "", rangeKm: "", chargingType: "Type2" });

    const fetchVehicles = async () => {
        const res = await fetch("/api/vehicles");
        const data = await res.json();
        setVehicles(data.vehicles || []);
        setLoading(false);
    };

    useEffect(() => { fetchVehicles(); }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/vehicles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: form.model,
                batteryCapacity: Number(form.batteryCapacity),
                rangeKm: Number(form.rangeKm),
                chargingType: form.chargingType,
            }),
        });
        setForm({ model: "", batteryCapacity: "", rangeKm: "", chargingType: "Type2" });
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
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Vehicle</DialogTitle>
                            <DialogDescription>Enter your electric vehicle details</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Model</Label>
                                <Input placeholder="e.g. Tesla Model 3" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Battery (kWh)</Label>
                                    <Input type="number" placeholder="e.g. 75" value={form.batteryCapacity} onChange={(e) => setForm({ ...form, batteryCapacity: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Range (km)</Label>
                                    <Input type="number" placeholder="e.g. 400" value={form.rangeKm} onChange={(e) => setForm({ ...form, rangeKm: e.target.value })} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Charging Type</Label>
                                <Select value={form.chargingType} onValueChange={(v) => setForm({ ...form, chargingType: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {["Type1", "Type2", "CCS", "CHAdeMO", "Tesla"].map((t) => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="w-full">Add Vehicle</Button>
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
                        <Card key={v._id} className="group hover:shadow-lg transition-all">
                            <div className="h-1.5 bg-gradient-to-r from-green-400 to-green-600" />
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Car className="h-5 w-5 text-primary" />
                                        {v.model}
                                    </CardTitle>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v._id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
                                        <Battery className="h-5 w-5 text-primary mb-1" />
                                        <span className="text-lg font-bold">{v.batteryCapacity}</span>
                                        <span className="text-xs text-muted-foreground">kWh</span>
                                    </div>
                                    <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
                                        <Gauge className="h-5 w-5 text-primary mb-1" />
                                        <span className="text-lg font-bold">{v.rangeKm}</span>
                                        <span className="text-xs text-muted-foreground">km</span>
                                    </div>
                                    <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
                                        <Zap className="h-5 w-5 text-primary mb-1" />
                                        <span className="text-sm font-bold">{v.chargingType}</span>
                                        <span className="text-xs text-muted-foreground">Charger</span>
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
