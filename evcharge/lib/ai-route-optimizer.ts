type AiRouteStation = {
    _id: string;
    name: string;
    city: string;
    chargerType: string;
    pricePerKwh: number;
    rating: number;
    availableNow: number;
    totalChargingPoints: number;
    distanceToRouteKm: number;
    distanceFromStartKm: number;
    progress: number;
    estimatedWaitMinutes: number;
    estimatedChargeCostLkr: number;
};

interface OptimizeRouteInput {
    routeDistanceKm: number;
    routeDurationMinutes: number;
    planningRangeKm: number;
    safeStops: AiRouteStation[];
    candidateStations: AiRouteStation[];
}

type AiBreakdown = {
    stationId: string;
    stationName: string;
    waitScore: number;
    costScore: number;
    detourScore: number;
    overallScore: number;
    reason: string;
};

export interface AiRouteOptimizationResult {
    provider: "google-gemini" | "heuristic-fallback";
    enabled: boolean;
    summary: string;
    optimizedStopIds: string[];
    scoreBreakdown: AiBreakdown[];
}

const GEMINI_MODEL = "gemini-2.0-flash";

function scoreHeuristically(station: AiRouteStation): AiBreakdown {
    const waitScore = Math.max(0, 100 - station.estimatedWaitMinutes * 3);
    const costScore = Math.max(0, 100 - station.pricePerKwh * 1.1);
    const detourScore = Math.max(0, 100 - station.distanceToRouteKm * 12);
    const ratingScore = Math.min(100, Math.max(0, station.rating * 20));
    const overallScore =
        waitScore * 0.45 +
        costScore * 0.35 +
        detourScore * 0.15 +
        ratingScore * 0.05;

    return {
        stationId: station._id,
        stationName: station.name,
        waitScore: Math.round(waitScore),
        costScore: Math.round(costScore),
        detourScore: Math.round(detourScore),
        overallScore: Math.round(overallScore),
        reason:
            station.estimatedWaitMinutes <= 8
                ? "Low estimated queue time."
                : station.pricePerKwh <= 90
                    ? "Good charging cost for this route."
                    : "Balanced score for route coverage.",
    };
}

function getHeuristicOptimization(input: OptimizeRouteInput): AiRouteOptimizationResult {
    const breakdown = input.safeStops.map(scoreHeuristically).sort((a, b) => b.overallScore - a.overallScore);
    const optimizedStopIds = breakdown.map((item) => item.stationId);

    return {
        provider: "heuristic-fallback",
        enabled: false,
        summary:
            "Used built-in scoring (wait time, charging cost, and detour distance). Add GEMINI_API_KEY to enable Gemini-powered route intelligence.",
        optimizedStopIds,
        scoreBreakdown: breakdown,
    };
}

function extractJsonObject(text: string): string | null {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return null;
    return text.slice(first, last + 1);
}

function toNumber(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function buildPrompt(input: OptimizeRouteInput) {
    const candidateSummaries = input.safeStops.map((station) => ({
        stationId: station._id,
        name: station.name,
        city: station.city,
        chargerType: station.chargerType,
        pricePerKwh: station.pricePerKwh,
        estimatedWaitMinutes: station.estimatedWaitMinutes,
        estimatedChargeCostLkr: station.estimatedChargeCostLkr,
        distanceToRouteKm: station.distanceToRouteKm,
        distanceFromStartKm: station.distanceFromStartKm,
        rating: station.rating,
    }));

    return `
You are an EV route optimization engine.
Goal: return the most efficient charging-stop order with minimum waiting time and lowest realistic charging cost.

Hard constraints:
- Focus strongly on least waiting time and best charging cost.
- Prefer stations close to the route.
- Keep stop order progressive by distanceFromStartKm (no backward jumps).
- Use only station IDs from the provided list.

Route context:
- distanceKm: ${input.routeDistanceKm}
- durationMinutes: ${input.routeDurationMinutes}
- safeRangeKm: ${input.planningRangeKm}

Candidate safe stops:
${JSON.stringify(candidateSummaries, null, 2)}

Return strict JSON only, with this exact shape:
{
  "summary": "short summary in one sentence",
  "optimizedStopIds": ["stationId1", "stationId2"],
  "scoreBreakdown": [
    {
      "stationId": "stationId1",
      "stationName": "name",
      "waitScore": 0-100,
      "costScore": 0-100,
      "detourScore": 0-100,
      "overallScore": 0-100,
      "reason": "short reason"
    }
  ]
}
`;
}

export async function optimizeRouteWithGemini(
    input: OptimizeRouteInput
): Promise<AiRouteOptimizationResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return getHeuristicOptimization(input);
    }

    if (input.safeStops.length === 0) {
        return {
            provider: "google-gemini",
            enabled: true,
            summary: "No safe charging stops were available to optimize.",
            optimizedStopIds: [],
            scoreBreakdown: [],
        };
    }

    const prompt = buildPrompt(input);

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: prompt }],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.2,
                    },
                }),
                cache: "no-store",
            }
        );

        if (!res.ok) {
            return getHeuristicOptimization(input);
        }

        const data = (await res.json()) as {
            candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
            }>;
        };

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) {
            return getHeuristicOptimization(input);
        }

        const jsonText = extractJsonObject(text);
        if (!jsonText) {
            return getHeuristicOptimization(input);
        }

        const parsed = JSON.parse(jsonText) as {
            summary?: unknown;
            optimizedStopIds?: unknown;
            scoreBreakdown?: unknown;
        };

        const safeStopIdSet = new Set(input.safeStops.map((stop) => stop._id));
        const optimizedStopIds = Array.isArray(parsed.optimizedStopIds)
            ? parsed.optimizedStopIds
                .filter((id): id is string => typeof id === "string" && safeStopIdSet.has(id))
                .slice(0, input.safeStops.length)
            : [];

        const scoreBreakdown: AiBreakdown[] = Array.isArray(parsed.scoreBreakdown)
            ? parsed.scoreBreakdown
                .map((item) => {
                    const obj = item as Record<string, unknown>;
                    const stationId = typeof obj.stationId === "string" ? obj.stationId : "";
                    const safeStation = input.safeStops.find((station) => station._id === stationId);
                    if (!safeStation) return null;
                    return {
                        stationId,
                        stationName:
                            typeof obj.stationName === "string" ? obj.stationName : safeStation.name,
                        waitScore: toNumber(obj.waitScore),
                        costScore: toNumber(obj.costScore),
                        detourScore: toNumber(obj.detourScore),
                        overallScore: toNumber(obj.overallScore),
                        reason:
                            typeof obj.reason === "string"
                                ? obj.reason
                                : "Balanced by waiting time, cost, and route fit.",
                    };
                })
                .filter((item): item is AiBreakdown => Boolean(item))
            : [];

        const finalIds =
            optimizedStopIds.length > 0
                ? optimizedStopIds
                : getHeuristicOptimization(input).optimizedStopIds;

        return {
            provider: "google-gemini",
            enabled: true,
            summary:
                typeof parsed.summary === "string" && parsed.summary.trim().length > 0
                    ? parsed.summary
                    : "Gemini prioritized low wait time and charging cost while staying route-efficient.",
            optimizedStopIds: finalIds,
            scoreBreakdown,
        };
    } catch {
        return getHeuristicOptimization(input);
    }
}
