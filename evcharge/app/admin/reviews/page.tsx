"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trash2, MessageSquare, Loader2 } from "lucide-react";

interface Review {
    _id: string;
    userId?: { name: string; email: string };
    stationId?: { name: string; city: string };
    rating: number;
    comment: string;
    createdAt: string;
}

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/reviews")
            .then((res) => res.json())
            .then((data) => setReviews(data.reviews || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const deleteReview = async (id: string) => {
        const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        if (res.ok) {
            setReviews((prev) => prev.filter((r) => r._id !== id));
        }
    };

    const ratingSummary = useMemo(() => {
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((r) => { counts[r.rating] = (counts[r.rating] || 0) + 1; });
        return counts;
    }, [reviews]);

    const totalReviews = reviews.length;
    const weightedSum = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalReviews > 0 ? (weightedSum / totalReviews).toFixed(1) : "0.0";

    const renderStars = (count: number) =>
        Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`h-4 w-4 ${i < count ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
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
                <p className="text-muted-foreground">EV charging station ratings and reviews</p>
            </div>

            {/* Rating Summary */}
            <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="text-center md:text-left md:pr-8 md:border-r border-border">
                            <p className="text-5xl font-bold tracking-tight">{avgRating}</p>
                            <div className="flex items-center justify-center md:justify-start gap-1 mt-2">
                                {renderStars(Math.round(Number(avgRating)))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{totalReviews} total reviews</p>
                        </div>
                        <div className="flex-1 space-y-2">
                            {[5, 4, 3, 2, 1].map((star) => {
                                const count = ratingSummary[star] || 0;
                                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                return (
                                    <div key={star} className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 w-24 shrink-0">{renderStars(star)}</div>
                                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${percentage}%` }} />
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground w-8 text-right">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Reviews List */}
            <div>
                <h2 className="text-lg font-semibold mb-3">All Reviews ({reviews.length})</h2>
                {reviews.length === 0 ? (
                    <Card className="border-0 shadow-md">
                        <CardContent className="p-12 text-center">
                            <MessageSquare className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-muted-foreground font-medium">No reviews yet.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {reviews.map((r) => (
                            <Card key={r._id} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                                                    {(r.userId?.name || "?").charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{r.userId?.name || "Unknown User"}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {r.stationId?.name || "Unknown Station"} · {new Date(r.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 my-2 ml-11">{renderStars(r.rating)}</div>
                                            <p className="text-sm text-muted-foreground ml-11">{r.comment}</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="gap-1 shrink-0"
                                            onClick={() => deleteReview(r._id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> Delete
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
