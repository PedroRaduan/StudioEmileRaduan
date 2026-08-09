"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_TIMEZONE } from "@/lib/date-time";
import { minuteOfDayInTimezone } from "@/lib/agenda/timeline";

type Props = {
  date: string;
  gridStartMinute: number;
  gridEndMinute: number;
  pixelsPerMinute: number;
  timezone?: string;
};

export function CurrentTimeLine({ date, gridStartMinute, gridEndMinute, pixelsPerMinute, timezone = DEFAULT_TIMEZONE }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const positioned = useRef(false);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!now || positioned.current || !lineRef.current) return;
    positioned.current = true;
    const rect = lineRef.current.getBoundingClientRect();
    const outsideComfortableView = rect.top < 120 || rect.top > window.innerHeight - 100;
    if (outsideComfortableView && window.scrollY < 160) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      lineRef.current.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    }
  }, [now]);

  if (!now) return null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
  const minute = minuteOfDayInTimezone(now, timezone);
  if (today !== date || minute < gridStartMinute || minute > gridEndMinute) return null;

  const label = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(now);
  return (
    <div className="timeline-now" ref={lineRef} style={{ top: (minute - gridStartMinute) * pixelsPerMinute }}>
      <span>{label}</span>
    </div>
  );
}
