"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Building2,
    CheckCircle2,
    DollarSign,
    Loader2,
    Mail,
    MapPin,
    MapPinCheck,
    Navigation,
    Phone,
    Plug,
    Send,
    ShieldCheck,
    Sparkles,
    Star,
    User as UserIcon,
    Users,
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

const MapViewLeaflet = dynamic(() => import("@/components/map-view-leaflet"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-border bg-muted/30">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    ),
});

const CHARGER_TYPES = ["Type1", "Type2", "CCS", "CHAdeMO", "Tesla"] as const;

const NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s'.&-]*$/;
const PERSON_NAME_REGEX = /^[A-Za-z][A-Za-z\s'.-]*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d][\d\s-]{6,16}$/;

interface FormState {
    submitterName: string;
    submitterEmail: string;
    contactPhone: string;
    name: string;
    city: string;
    address: string;
    chargerType: string[];
    totalChargingPoints: string;
    pricePerKwh: string;
    reservationFeePerHour: string;
    latitude: string;
    longitude: string;
    description: string;
    status: "AVAILABLE" | "LIMITED" | "MAINTENANCE";
}

const INITIAL_FORM: FormState = {
    submitterName: "",
    submitterEmail: "",
    contactPhone: "",
    name: "",
    city: "",
    address: "",
    chargerType: ["Type2"],
    totalChargingPoints: "",
    pricePerKwh: "",
    reservationFeePerHour: "",
    latitude: "",
    longitude: "",
    description: "",
    status: "AVAILABLE",
};

const BENEFITS = [
    {
        icon: Users,
        title: "Reach more EV drivers",
        desc: "Get discovered by thousands of verified ChargeX customers actively searching for stations.",
    },
    {
        icon: DollarSign,
        title: "Maximize utilization",
        desc: "Pre-bookings keep your chargers occupied around the clock and grow your revenue.",
    },
    {
        icon: ShieldCheck,
        title: "Trusted partner network",
        desc: "We verify every listing to ensure quality, reliability, and safety for both sides.",
    },
    {
        icon: MapPinCheck, 
        title: "Free to list",
        desc: "No upfront cost. No account required. Just submit, get approved, and you're live.",
    },
];

const STEPS = [
    {
        num: "01",
        title: "Submit details",
        desc: "Fill the form below — no account needed. Just share your station info and how to reach you.",
    },
    {
        num: "02",
        title: "Admin review",
        desc: "Our team reviews and verifies your submission, usually within 24 hours.",
    },
    {
        num: "03",
        title: "Go live",
        desc: "Once approved, your station appears on ChargeX and starts receiving bookings.",
    },
];

function isValidLat(lat: number) {
    return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

function isValidLng(lng: number) {
    return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export default function ListStationPage() {
    const { isLoaded, isSignedIn } = useAuth();
    const { user: clerkUser } = useUser();
    const { user, fetchUser } = useAuthStore();
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [prefilled, setPrefilled] = useState(false);

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            fetchUser();
        }
    }, [isLoaded, isSignedIn, fetchUser]);

    useEffect(() => {
        if (prefilled || !isLoaded) return;
        if (!isSignedIn) {
            setPrefilled(true);
            return;
        }
        const name =
            user?.name ||
            (clerkUser?.firstName
                ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
                : "");
        const email =
            user?.email ||
            clerkUser?.primaryEmailAddress?.emailAddress ||
            clerkUser?.emailAddresses?.[0]?.emailAddress ||
            "";
        if (name || email) {
            setForm((prev) => ({
                ...prev,
                submitterName: prev.submitterName || name,
                submitterEmail: prev.submitterEmail || email,
            }));
            setPrefilled(true);
        }
    }, [isLoaded, isSignedIn, user, clerkUser, prefilled]);

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const toggleCharger = (type: string) => {
        setForm((prev) => ({
            ...prev,
            chargerType: prev.chargerType.includes(type)
                ? prev.chargerType.filter((t) => t !== type)
                : [...prev.chargerType, type],
        }));
    };

    const useCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported in this browser.");
            return;
        }
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                update("latitude", pos.coords.latitude.toFixed(6));
                update("longitude", pos.coords.longitude.toFixed(6));
                setGeoLoading(false);
                toast.success("Location captured.");
            },
            () => {
                setGeoLoading(false);
                toast.error("Couldn't get your location. Please enter manually.");
            }
        );
    };

    const previewStation = useMemo(() => {
        const lat = Number(form.latitude);
        const lng = Number(form.longitude);
        if (!isValidLat(lat) || !isValidLng(lng)) return null;
        return [
            {
                _id: "preview",
                name: form.name || "Your Station",
                city: form.city,
                location: { latitude: lat, longitude: lng },
                availabilityStatus: "Available" as const,
            },
        ];
    }, [form.latitude, form.longitude, form.name, form.city]);

    const validate = (): string | null => {
        const submitterName = form.submitterName.trim();
        if (!submitterName || submitterName.length < 2) return "Your full name is required.";
        if (!PERSON_NAME_REGEX.test(submitterName)) return "Your name contains invalid characters.";

        const submitterEmail = form.submitterEmail.trim();
        if (!submitterEmail || !EMAIL_REGEX.test(submitterEmail))
            return "Please enter a valid email address.";

        const contactPhone = form.contactPhone.trim();
        if (!contactPhone || !PHONE_REGEX.test(contactPhone))
            return "Please enter a valid contact phone number.";

        if (!form.name.trim() || form.name.trim().length < 3)
            return "Station name must be at least 3 characters.";
        if (!NAME_REGEX.test(form.name.trim())) return "Station name contains invalid characters.";
        if (!form.city.trim()) return "City is required.";
        if (!form.address.trim()) return "Address is required.";
        if (form.chargerType.length === 0) return "Select at least one charger type.";

        const points = Number(form.totalChargingPoints);
        if (!Number.isFinite(points) || points < 1)
            return "Total charging points must be at least 1.";

        const price = Number(form.pricePerKwh);
        if (!Number.isFinite(price) || price < 0) return "Price per kWh is invalid.";

        const lat = Number(form.latitude);
        const lng = Number(form.longitude);
        if (!isValidLat(lat) || !isValidLng(lng))
            return "Please provide valid coordinates.";

        if (countWords(form.description) > MAX_DESCRIPTION_WORDS) {
            return DESCRIPTION_WORD_ERROR;
        }

        return null;
    };

    const descriptionWordCount = useMemo(
        () => countWords(form.description),
        [form.description]
    );
    const descriptionOverLimit = descriptionWordCount > MAX_DESCRIPTION_WORDS;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validate();
        if (err) {
            toast.error(err);
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/stations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    submitterName: form.submitterName.trim(),
                    submitterEmail: form.submitterEmail.trim(),
                    contactPhone: form.contactPhone.trim(),
                    name: form.name.trim(),
                    city: form.city.trim(),
                    address: form.address.trim(),
                    chargerType: form.chargerType,
                    totalChargingPoints: Number(form.totalChargingPoints),
                    totalSlots: Number(form.totalChargingPoints),
                    pricePerKwh: Number(form.pricePerKwh),
                    reservationFeePerHour: form.reservationFeePerHour
                        ? Number(form.reservationFeePerHour)
                        : undefined,
                    status: form.status,
                    description: sanitizeDescription(form.description) || undefined,
                    location: {
                        latitude: Number(form.latitude),
                        longitude: Number(form.longitude),
                    },
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to submit station");
                return;
            }

            setSubmitted(true);
            toast.success(data.message || "Submission received!");
        } catch {
            toast.error("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSubmitted(false);
        setForm({
            ...INITIAL_FORM,
            submitterName: form.submitterName,
            submitterEmail: form.submitterEmail,
            contactPhone: form.contactPhone,
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#f8fbf8] via-white to-[#f7faf8]">
            {/* Hero */}
            <section className="relative overflow-hidden border-b bg-slate-950 text-white">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage:
                            "url('https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1600&q=80')",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/70 to-slate-950/95" />
                <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-28 sm:px-6 lg:px-8">
                    <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white">
                        <Building2 className="h-3.5 w-3.5" />
                        For Charger Owners
                    </span>
                    <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
                        List your charging station on{" "}
                        <span className="text-green-400">ChargeX</span>
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm text-white/80 sm:text-base">
                        Join Sri Lanka&apos;s fastest growing EV charging network. No account
                        needed — just submit your station and our admin team will get back to you.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/80 sm:text-sm">
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                            Free listing
                        </span>
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                            No login required
                        </span>
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                            Approved within 24h
                        </span>
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mb-8 max-w-2xl">
                        <p className="text-sm font-semibold text-primary">Why list with us</p>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            Built for charger operators of every size
                        </h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {BENEFITS.map(({ icon: Icon, title, desc }) => (
                            <Card
                                key={title}
                                className="border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                            >
                                <CardContent className="p-6">
                                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="mb-1.5 text-base font-semibold text-foreground">
                                        {title}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {desc}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="border-b border-slate-200 bg-muted/40">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mb-8 max-w-2xl">
                        <p className="text-sm font-semibold text-primary">How it works</p>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            Get listed in 3 simple steps
                        </h2>
                    </div>
                    <div className="grid gap-8 md:grid-cols-3">
                        {STEPS.map(({ num, title, desc }) => (
                            <div key={num} className="relative">
                                <span className="text-6xl font-black leading-none text-primary/15">
                                    {num}
                                </span>
                                <div className="mt-3">
                                    <h3 className="mb-1.5 text-lg font-bold text-foreground">{title}</h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Form */}
            <section className="py-14">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-8 max-w-2xl">
                        <p className="text-sm font-semibold text-primary">Submit your station</p>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            Tell us about your charging station
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Provide accurate details. Our team will reach out using the contact info
                            you share if anything needs clarification.
                        </p>
                    </div>

                    {submitted ? (
                        <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-white shadow-sm">
                            <CardContent className="p-10 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 text-white shadow-md">
                                    <CheckCircle2 className="h-7 w-7" />
                                </div>
                                <h3 className="mb-2 text-xl font-bold text-slate-900">
                                    Submission received!
                                </h3>
                                <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
                                    Thanks for submitting your station. Our admin team will review the
                                    details and contact you at{" "}
                                    <span className="font-medium text-foreground">
                                        {form.submitterEmail}
                                    </span>{" "}
                                    once approved.
                                </p>
                                <div className="flex flex-wrap justify-center gap-3">
                                    <Button
                                        onClick={resetForm}
                                        variant="outline"
                                        className="rounded-xl"
                                    >
                                        Submit another station
                                    </Button>
                                    <Link href="/stations">
                                        <Button className="rounded-xl">Browse stations</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
                            <Card className="overflow-hidden border border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] lg:col-span-3">
                                <CardContent className="p-6 sm:p-8">
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Section: Contact */}
                                        <div>
                                            <div className="mb-4 flex items-center justify-between">
                                                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                                                    Your Contact Info
                                                </h3>
                                                {isLoaded && isSignedIn ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                                                        <CheckCircle2 className="h-3 w-3" /> Pre-filled
                                                        from your account
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="mb-3 text-xs text-muted-foreground">
                                                We use this only to reach out about your submission.
                                                You don&apos;t need an account.
                                            </p>
                                            <div className="space-y-4">
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-1.5">
                                                        <Label className="flex items-center gap-1.5">
                                                            <UserIcon className="h-3.5 w-3.5" /> Full Name
                                                        </Label>
                                                        <Input
                                                            placeholder="e.g. Nimal Perera"
                                                            value={form.submitterName}
                                                            onChange={(e) =>
                                                                update("submitterName", e.target.value)
                                                            }
                                                            required
                                                            className="h-11 rounded-xl"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="flex items-center gap-1.5">
                                                            <Mail className="h-3.5 w-3.5" /> Email
                                                        </Label>
                                                        <Input
                                                            type="email"
                                                            placeholder="you@example.com"
                                                            value={form.submitterEmail}
                                                            onChange={(e) =>
                                                                update("submitterEmail", e.target.value)
                                                            }
                                                            required
                                                            className="h-11 rounded-xl"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="flex items-center gap-1.5">
                                                        <Phone className="h-3.5 w-3.5" /> Contact Phone
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. +94 78 188 8084"
                                                        value={form.contactPhone}
                                                        onChange={(e) =>
                                                            update("contactPhone", e.target.value)
                                                        }
                                                        required
                                                        className="h-11 rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Basic info */}
                                        <div>
                                            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
                                                Station Details
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <Label>Station Name</Label>
                                                    <Input
                                                        placeholder="e.g. Charge X Colombo"
                                                        value={form.name}
                                                        onChange={(e) => update("name", e.target.value)}
                                                        required
                                                        className="h-11 rounded-xl"
                                                    />
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-1.5">
                                                        <Label>City</Label>
                                                        <Input
                                                            placeholder="e.g. Colombo"
                                                            value={form.city}
                                                            onChange={(e) => update("city", e.target.value)}
                                                            required
                                                            className="h-11 rounded-xl"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label>Initial Status</Label>
                                                        <Select
                                                            value={form.status}
                                                            onValueChange={(v) =>
                                                                update(
                                                                    "status",
                                                                    v as FormState["status"]
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger className="h-11 rounded-xl">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="AVAILABLE">
                                                                    Available
                                                                </SelectItem>
                                                                <SelectItem value="LIMITED">Limited</SelectItem>
                                                                <SelectItem value="MAINTENANCE">
                                                                    Maintenance
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label>Full Address</Label>
                                                    <Input
                                                        placeholder="e.g. 12 York St, Colombo 01"
                                                        value={form.address}
                                                        onChange={(e) => update("address", e.target.value)}
                                                        required
                                                        className="h-11 rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Charging */}
                                        <div>
                                            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
                                                Charging Setup
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <Label>Charger Type(s)</Label>
                                                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-input bg-background p-3 sm:grid-cols-5">
                                                        {CHARGER_TYPES.map((type) => {
                                                            const checked = form.chargerType.includes(type);
                                                            return (
                                                                <label
                                                                    key={type}
                                                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                                                        checked
                                                                            ? "border-primary bg-primary/5 text-primary"
                                                                            : "border-transparent text-muted-foreground hover:bg-muted/50"
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        className="h-3.5 w-3.5 accent-primary"
                                                                        checked={checked}
                                                                        onChange={() => toggleCharger(type)}
                                                                    />
                                                                    <span className="font-medium">{type}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-1.5">
                                                        <Label>Total Charging Points</Label>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            placeholder="e.g. 4"
                                                            value={form.totalChargingPoints}
                                                            onChange={(e) =>
                                                                update("totalChargingPoints", e.target.value)
                                                            }
                                                            required
                                                            className="h-11 rounded-xl"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label>Charging Rate (LKR / kWh)</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="e.g. 130"
                                                            value={form.pricePerKwh}
                                                            onChange={(e) =>
                                                                update("pricePerKwh", e.target.value)
                                                            }
                                                            required
                                                            className="h-11 rounded-xl"
                                                        />
                                                        <p className="text-[11px] text-muted-foreground">
                                                            Your station&apos;s electricity rate. Drivers pay the actual charging cost to your station based on energy consumed.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label>
                                                        Reservation Fee Per Hour (LKR){" "}
                                                        <span className="text-xs font-normal text-muted-foreground">
                                                            (optional)
                                                        </span>
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        placeholder="e.g. 100"
                                                        value={form.reservationFeePerHour}
                                                        onChange={(e) =>
                                                            update("reservationFeePerHour", e.target.value)
                                                        }
                                                        className="h-11 rounded-xl"
                                                    />
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Suggested booking fee per hour. Admin may adjust this before approval. Defaults to LKR 100 / hour if left blank.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Location */}
                                        <div>
                                            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
                                                Location
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-1.5">
                                                        <Label>Latitude</Label>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            placeholder="e.g. 6.9271"
                                                            value={form.latitude}
                                                            onChange={(e) =>
                                                                update("latitude", e.target.value)
                                                            }
                                                            required
                                                            className="h-11 rounded-xl"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label>Longitude</Label>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            placeholder="e.g. 79.8612"
                                                            value={form.longitude}
                                                            onChange={(e) =>
                                                                update("longitude", e.target.value)
                                                            }
                                                            required
                                                            className="h-11 rounded-xl"
                                                        />
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full gap-2 rounded-xl"
                                                    onClick={useCurrentLocation}
                                                    disabled={geoLoading}
                                                >
                                                    {geoLoading ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Navigation className="h-3.5 w-3.5" />
                                                    )}
                                                    Use my current location
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Section: Description */}
                                        <div>
                                            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
                                                Additional Details
                                            </h3>
                                            <div className="space-y-1.5">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <Label htmlFor="station-description">
                                                        Description{" "}
                                                        <span className="text-xs font-normal text-muted-foreground">
                                                            (optional)
                                                        </span>
                                                    </Label>
                                                    <span
                                                        className={`text-[11px] font-medium tabular-nums ${
                                                            descriptionOverLimit
                                                                ? "text-red-600"
                                                                : "text-muted-foreground"
                                                        }`}
                                                        aria-live="polite"
                                                    >
                                                        {descriptionWordCount} / {MAX_DESCRIPTION_WORDS} words
                                                    </span>
                                                </div>
                                                <Textarea
                                                    id="station-description"
                                                    placeholder={DESCRIPTION_PLACEHOLDER}
                                                    rows={5}
                                                    value={form.description}
                                                    onChange={(e) =>
                                                        update("description", e.target.value)
                                                    }
                                                    className={`min-h-[140px] w-full max-w-full resize-y rounded-xl text-sm leading-relaxed ${
                                                        descriptionOverLimit
                                                            ? "border-red-400 focus-visible:ring-red-400"
                                                            : ""
                                                    }`}
                                                    style={{
                                                        wordBreak: "break-word",
                                                        overflowWrap: "anywhere",
                                                    }}
                                                    aria-invalid={descriptionOverLimit}
                                                    aria-describedby="station-description-help"
                                                />
                                                <p
                                                    id="station-description-help"
                                                    className={`text-xs ${
                                                        descriptionOverLimit
                                                            ? "font-medium text-red-600"
                                                            : "text-muted-foreground"
                                                    }`}
                                                >
                                                    {descriptionOverLimit
                                                        ? DESCRIPTION_WORD_ERROR
                                                        : `Up to ${MAX_DESCRIPTION_WORDS} words. Tip: keep it concise — the most useful info wins more bookings.`}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            size="lg"
                                            className="h-12 w-full gap-2 rounded-xl text-base font-semibold"
                                            disabled={submitting || descriptionOverLimit}
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-4 w-4" /> Submit for review
                                                </>
                                            )}
                                        </Button>
                                        <p className="text-center text-xs text-muted-foreground">
                                            By submitting you agree to our review process. We&apos;ll
                                            email you once your station is approved.
                                        </p>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Side panel: live preview & tips */}
                            <div className="space-y-4 lg:col-span-2 lg:sticky lg:top-24">
                                <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
                                    <CardContent className="p-5">
                                        <div className="mb-3 flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-primary" />
                                            <p className="text-sm font-semibold text-foreground">
                                                Map preview
                                            </p>
                                        </div>
                                        <div className="h-[260px] overflow-hidden rounded-xl">
                                            {previewStation ? (
                                                <MapViewLeaflet
                                                    stations={previewStation}
                                                    center={{
                                                        lat: Number(form.latitude),
                                                        lng: Number(form.longitude),
                                                    }}
                                                    className="h-full"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center">
                                                    <p className="px-4 text-xs text-muted-foreground">
                                                        Enter latitude and longitude (or use current
                                                        location) to see your station on the map.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
                                    <CardContent className="p-5">
                                        <div className="mb-3 flex items-center gap-2">
                                            <Star className="h-4 w-4 text-amber-500" />
                                            <p className="text-sm font-semibold text-foreground">
                                                Tips for fast approval
                                            </p>
                                        </div>
                                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                                            <li className="flex gap-2">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                                Use the exact business name and a clear address.
                                            </li>
                                            <li className="flex gap-2">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                                Pin the precise location with the &quot;Use current
                                                location&quot; button while at the station.
                                            </li>
                                            <li className="flex gap-2">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                                Provide a phone number you actually answer so admin can
                                                verify quickly.
                                            </li>
                                            <li className="flex gap-2">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                                Select all supported charger types and your accurate
                                                charging rate (LKR / kWh).
                                            </li>
                                        </ul>
                                    </CardContent>
                                </Card>

                                <Card className="border border-slate-200 bg-white shadow-sm">
                                    <CardContent className="p-5">
                                        <div className="mb-2 flex items-center gap-2">
                                            <Plug className="h-4 w-4 text-primary" />
                                            <p className="text-sm font-semibold text-foreground">
                                                Already a station owner?
                                            </p>
                                        </div>
                                        <p className="mb-4 text-sm text-muted-foreground">
                                            Sign in to manage your existing stations, slots, and
                                            bookings from the owner dashboard.
                                        </p>
                                        <Link href="/owner/stations">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 rounded-xl"
                                            >
                                                <Zap className="h-3.5 w-3.5" /> Open owner dashboard
                                            </Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
