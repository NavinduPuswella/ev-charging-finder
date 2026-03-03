"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plug, Plus, Loader2 } from "lucide-react";

interface Station { _id: string; name: string; }
interface SlotData { _id: string; stationId: string; startTime: string; endTime: string; status: string; }

export default function SlotsPage() {
    const [stations, setStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState("");
    const [slots, setSlots] = useState<SlotData[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    useEffect(() => {
        const fetchStations = async () => {
            const res = await fetch("/api/stations");
            const data = await res.json();
            setStations(data.stations || []);
            setLoading(false);
        };
        fetchStations();
    }, []);

    const fetchSlots = async (stationId: string) => {
        const res = await fetch(`/api/stations/${stationId}/slots`);
        const data = await res.json();
        setSlots(data.slots || []);
    };

    const handleStationChange = (id: string) => {
        setSelectedStation(id);
        fetchSlots(id);
    };

    const handleAddSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch(`/api/stations/${selectedStation}/slots`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ startTime, endTime }),
        });
        setDialogOpen(false);
        setStartTime("");
        setEndTime("");
        fetchSlots(selectedStation);
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold">Manage Slots</h1><p className="text-muted-foreground">Add and manage time slots for your stations</p></div>
                {selectedStation && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Slot</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add New Slot</DialogTitle><DialogDescription>Set the time range for this slot</DialogDescription></DialogHeader>
                            <form onSubmit={handleAddSlot} className="space-y-4">
                                <div className="space-y-2"><Label>Start Time</Label><Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></div>
                                <div className="space-y-2"><Label>End Time</Label><Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required /></div>
                                <DialogFooter><Button type="submit" className="w-full">Add Slot</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="space-y-2">
                <Label>Select Station</Label>
                <Select value={selectedStation} onValueChange={handleStationChange}>
                    <SelectTrigger className="w-full max-w-md"><SelectValue placeholder="Choose a station" /></SelectTrigger>
                    <SelectContent>{stations.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>

            {selectedStation && (
                slots.length === 0 ? (
                    <Card><CardContent className="p-8 text-center"><Plug className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-muted-foreground">No slots configured. Add your first slot.</p></CardContent></Card>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {slots.map((slot) => (
                            <Card key={slot._id}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium">Slot</CardTitle>
                                        <Badge variant={slot.status === "AVAILABLE" ? "success" : "secondary"}>{slot.status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm">{new Date(slot.startTime).toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">to {new Date(slot.endTime).toLocaleString()}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
