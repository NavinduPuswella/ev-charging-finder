"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface StationDescriptionProps {
    text?: string | null;
    /** Approx character count above which we auto-collapse and show "Show more". */
    collapseAtChars?: number;
    label?: string;
    className?: string;
    showLabel?: boolean;
}

export function StationDescription({
    text,
    collapseAtChars = 280,
    label = "Description",
    className,
    showLabel = true,
}: StationDescriptionProps) {
    const [expanded, setExpanded] = useState(false);

    const trimmed = useMemo(() => (text ?? "").trim(), [text]);
    if (!trimmed) return null;

    const isLong = trimmed.length > collapseAtChars;
    const showToggle = isLong;

    return (
        <div
            className={cn(
                "rounded-xl border border-slate-200 bg-slate-50/80 p-3.5",
                className
            )}
        >
            {showLabel ? (
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    {label}
                </div>
            ) : null}
            <p
                className={cn(
                    "text-sm leading-relaxed text-slate-700",
                    !expanded && isLong ? "line-clamp-4" : ""
                )}
                style={{
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    whiteSpace: "pre-wrap",
                }}
            >
                {trimmed}
            </p>
            {showToggle ? (
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="mt-2 inline-flex items-center text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800 focus:outline-none focus-visible:underline"
                    aria-expanded={expanded}
                >
                    {expanded ? "Show less" : "Show more"}
                </button>
            ) : null}
        </div>
    );
}
