"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Star,
    Trash2,
    MessageSquare,
    Loader2,
    Filter,
    X,
    SearchX,
} from "lucide-react";

interface Review {
    _id: string;
    userId?: { name: string; email: string };
    stationId?: { _id: string; name: string; city: string };
    rating: number;
    comment: string;
    createdAt: string;
}

interface StationOption {
    id: string;
    name: string;
}

function buildMonthOptions(reviews: Review[]): { value: string; label: string }[] {
    const months = new Map<string, string>();
    for (const r of reviews) {
        const d = new Date(r.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!months.has(key)) {
            months.set(
                key,
                d.toLocaleString("default", { month: "long", year: "numeric" })
            );
        }
    }
    return Array.from(months.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([value, label]) => ({ value, label }));
}

export default function ReviewsPage() {
    const [allReviews, setAllReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const [filterStation, setFilterStation] = useState("all");
    const [filterRating, setFilterRating] = useState("all");
    const [filterMonth, setFilterMonth] = useState("all");

    const fetchReviews = useCallback(() => {
        setLoading(true);
        fetch("/api/admin/reviews")
            .then((res) => res.json())
            .then((data) => setAllReviews(data.reviews || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const stationOptions = useMemo<StationOption[]>(() => {
        const map = new Map<string, string>();
        for (const r of allReviews) {
            if (r.stationId?._id && r.stationId?.name) {
                map.set(r.stationId._id, r.stationId.name);
            }
        }
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allReviews]);

    const monthOptions = useMemo(() => buildMonthOptions(allReviews), [allReviews]);

    const filteredReviews = useMemo(() => {
        let list = allReviews;

        if (filterStation !== "all") {
            list = list.filter((r) => r.stationId?._id === filterStation);
        }

        if (filterRating !== "all") {
            const ratingNum = Number(filterRating);
            list = list.filter((r) => r.rating === ratingNum);
        }

        if (filterMonth !== "all") {
            const [year, mon] = filterMonth.split("-").map(Number);
            list = list.filter((r) => {
                const d = new Date(r.createdAt);
                return d.getFullYear() === year && d.getMonth() + 1 === mon;
            });
        }

        return list;
    }, [allReviews, filterStation, filterRating, filterMonth]);

    const hasActiveFilters =
        filterStation !== "all" || filterRating !== "all" || filterMonth !== "all";

    const clearFilters = () => {
        setFilterStation("all");
        setFilterRating("all");
        setFilterMonth("all");
    };

    const deleteReview = async (id: string) => {
        const res = await fetch(
            `/api/admin/reviews?id=${encodeURIComponent(id)}`,
            { method: "DELETE" }
        );
        if (res.ok) {
            setAllReviews((prev) => prev.filter((r) => r._id !== id));
        }
    };

    const ratingSummary = useMemo(() => {
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        filteredReviews.forEach((r) => {
            counts[r.rating] = (counts[r.rating] || 0) + 1;
        });
        return counts;
    }, [filteredReviews]);

    const totalReviews = filteredReviews.length;
    const weightedSum = filteredReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating =
        totalReviews > 0 ? (weightedSum / totalReviews).toFixed(1) : "0.0";

    const renderStars = (count: number) =>
        Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`h-4 w-4 ${
                    i < count
                        ? "fill-amber-400 text-amber-400"
                        : "fill-gray-200 text-gray-200"
                }`}
            />
        ));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
                <p className="text-muted-foreground">
                    EV charging station ratings and reviews
                </p>
            </div>

         
            <Card className="border-0 shadow-md">
                <CardContent className="p-4 sm:p-5">
                    <div className="mb-3 flex items-center gap-2">
                        <Filter className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-slate-900">
                            Filter Reviews
                        </span>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto h-7 gap-1 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                                onClick={clearFilters}
                            >
                                <X className="h-3 w-3" />
                                Clear Filters
                            </Button>
                        )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                Charging Station
                            </label>
                            <Select
                                value={filterStation}
                                onValueChange={setFilterStation}
                            >
                                <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-sm shadow-sm">
                                    <SelectValue placeholder="All Stations" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stations</SelectItem>
                                    {stationOptions.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                Rating
                            </label>
                            <Select
                                value={filterRating}
                                onValueChange={setFilterRating}
                            >
                                <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-sm shadow-sm">
                                    <SelectValue placeholder="All Ratings" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Ratings</SelectItem>
                                    {[5, 4, 3, 2, 1].map((r) => (
                                        <SelectItem key={r} value={String(r)}>
                                            {r} Star{r !== 1 ? "s" : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                Month
                            </label>
                            <Select
                                value={filterMonth}
                                onValueChange={setFilterMonth}
                            >
                                <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-sm shadow-sm">
                                    <SelectValue placeholder="All Months" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Months</SelectItem>
                                    {monthOptions.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

           
            <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="text-center md:text-left md:pr-8 md:border-r border-border">
                            <p className="text-5xl font-bold tracking-tight">
                                {avgRating}
                            </p>
                            <div className="flex items-center justify-center md:justify-start gap-1 mt-2">
                                {renderStars(Math.round(Number(avgRating)))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {totalReviews} total review
                                {totalReviews !== 1 ? "s" : ""}
                                {hasActiveFilters && (
                                    <span className="text-emerald-600"> (filtered)</span>
                                )}
                            </p>
                        </div>
                        <div className="flex-1 space-y-2">
                            {[5, 4, 3, 2, 1].map((star) => {
                                const count = ratingSummary[star] || 0;
                                const percentage =
                                    totalReviews > 0
                                        ? (count / totalReviews) * 100
                                        : 0;
                                return (
                                    <div
                                        key={star}
                                        className="flex items-center gap-3"
                                    >
                                        <div className="flex items-center gap-1 w-24 shrink-0">
                                            {renderStars(star)}
                                        </div>
                                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                                                style={{
                                                    width: `${percentage}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground w-8 text-right">
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {
            <div>
                <h2 className="text-lg font-semibold mb-3">
                    {hasActiveFilters ? "Filtered" : "All"} Reviews (
                    {filteredReviews.length})
                </h2>
                {filteredReviews.length === 0 ? (
                    <Card className="border-0 shadow-md">
                        <CardContent className="p-12 text-center">
                            {hasActiveFilters ? (
                                <>
                                    <SearchX className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                                    <p className="text-muted-foreground font-medium">
                                        No reviews found for the selected
                                        filters.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-4 gap-1.5"
                                        onClick={clearFilters}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        Clear Filters
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <MessageSquare className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                                    <p className="text-muted-foreground font-medium">
                                        No reviews yet.
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {filteredReviews.map((r) => (
                            <Card
                                key={r._id}
                                className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200"
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                                                    {(
                                                        r.userId?.name || "?"
                                                    ).charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {r.userId?.name ||
                                                            "Unknown User"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {r.stationId?.name ||
                                                            "Unknown Station"}{" "}
                                                        &middot;{" "}
                                                        {new Date(
                                                            r.createdAt
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 my-2 ml-11">
                                                {renderStars(r.rating)}
                                            </div>
                                            <p className="text-sm text-muted-foreground ml-11">
                                                {r.comment}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="gap-1 shrink-0"
                                            onClick={() =>
                                                deleteReview(r._id)
                                            }
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />{" "}
                                            Delete
                                        </Button>
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
