"use client";

import { useEffect, useRef, useState } from "react";
import { Battery } from "lucide-react";

const SUPPORTED_VEHICLES = [
  "Tesla Model 3",
  "Nissan Leaf",
  "Hyundai Ioniq 5",
  "BYD Atto 3",
  "Kia EV6",
  "MG ZS EV",
  "BMW i4",
  "Mercedes EQA",
  "Polestar 2",
];

export function SupportedVehiclesPills() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="flex flex-wrap gap-2.5">
      {SUPPORTED_VEHICLES.map((vehicle, index) => (
        <span
          key={vehicle}
          className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-medium text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm group ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
          style={{ transitionDelay: `${index * 70}ms` }}
        >
          <Battery className="h-3 w-3 text-primary transition-transform duration-200 group-hover:scale-110" />
          {vehicle}
        </span>
      ))}
    </div>
  );
}
