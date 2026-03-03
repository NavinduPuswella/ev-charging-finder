"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BookingCard from "@/components/booking-card";
import { Car, CalendarCheck, MapPin, Route, Zap, Plus } from "lucide-react";

interface Vehicle {
    _id: string;
    model: string;
    batteryCapacity: number;
    rangeKm: number;
    chargingType: string;
}

interface Booking {
    _id: string;
    date: string;
    duration: number;
    status: string;
    paymentStatus: string;
    amount: number;
    stationId: { name: string; city: string; pricePerKwh: number };
}

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vRes, bRes] = await Promise.all([
                    fetch("/api/vehicles"),
                    fetch("/api/bookings"),
                ]);
                const vData = await vRes.json();
                const bData = await bRes.json();
                setVehicles(vData.vehicles || []);
                setBookings(bData.bookings || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCancelBooking = async (id: string) => {
        try {
            await fetch(`/api/bookings/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "CANCELLED" }),
            });
            setBookings((prev) =>
                prev.map((b) =>
                    b._id === id ? { ...b, status: "CANCELLED", paymentStatus: "REFUNDED" } : b
                )
            );
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome */}
            <div>
                <h1 className="text-3xl font-bold">
                    Welcome back, <span className="text-primary">{user?.name}</span>
                </h1>
                <p className="text-muted-foreground mt-1">Here&apos;s your EV charging overview</p>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                {[
                    { icon: Car, label: "Vehicles", value: vehicles.length, color: "text-blue-600 bg-blue-50" },
                    { icon: CalendarCheck, label: "Total Bookings", value: bookings.length, color: "text-primary bg-primary/10" },
                    { icon: Zap, label: "Active", value: bookings.filter((b) => b.status === "CONFIRMED").length, color: "text-orange-600 bg-orange-50" },
                    { icon: CalendarCheck, label: "Completed", value: bookings.filter((b) => b.status === "COMPLETED").length, color: "text-green-600 bg-green-50" },
                ].map(({ icon: Icon, label, value, color }) => (
                    <Card key={label}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{label}</p>
                                    <p className="text-3xl font-bold mt-1">{value}</p>
                                </div>
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-3">
                <Link href="/stations">
                    <Card className="group cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all">
                        <CardContent className="p-6 text-center">
                            <MapPin className="h-8 w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                            <h3 className="font-semibold">Find Stations</h3>
                            <p className="text-sm text-muted-foreground mt-1">Search nearby charging stations</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/trip-planner">
                    <Card className="group cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all">
                        <CardContent className="p-6 text-center">
                            <Route className="h-8 w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                            <h3 className="font-semibold">Plan Trip</h3>
                            <p className="text-sm text-muted-foreground mt-1">Get AI-powered charging stops</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/vehicles">
                    <Card className="group cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all">
                        <CardContent className="p-6 text-center">
                            <Plus className="h-8 w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                            <h3 className="font-semibold">Add Vehicle</h3>
                            <p className="text-sm text-muted-foreground mt-1">Register your EV</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Recent Bookings */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Recent Bookings</h2>
                    <Link href="/dashboard/bookings">
                        <Button variant="ghost" size="sm">View All</Button>
                    </Link>
                </div>
                {bookings.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <CalendarCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground">No bookings yet. Find a station to get started!</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {bookings.slice(0, 3).map((booking) => (
                            <BookingCard
                                key={booking._id}
                                booking={booking}
                                onCancel={handleCancelBooking}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* My Vehicles */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">My Vehicles</h2>
                    <Link href="/dashboard/vehicles">
                        <Button variant="ghost" size="sm">Manage</Button>
                    </Link>
                </div>
                {vehicles.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <Car className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground">No vehicles added. Add your EV to get personalized recommendations.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {vehicles.map((v) => (
                            <Card key={v._id}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Car className="h-4 w-4 text-primary" />
                                        {v.model}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                                            <div className="font-semibold">{v.batteryCapacity}</div>
                                            <div className="text-xs text-muted-foreground">kWh</div>
                                        </div>
                                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                                            <div className="font-semibold">{v.rangeKm}</div>
                                            <div className="text-xs text-muted-foreground">km</div>
                                        </div>
                                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                                            <div className="font-semibold text-xs">{v.chargingType}</div>
                                            <div className="text-xs text-muted-foreground">Type</div>
                                        </div>
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
