"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) return null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
  const minute = minuteOfDayInTimezone(now, timezone);
  if (today !== date || minute < gridStartMinute || minute > gridEndMinute) return null;

  const label = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(now);
  return (
    <div className="timeline-now" style={{ top: (minute - gridStartMinute) * pixelsPerMinute }}>
      <span>{label}</span>
    </div>
  );
}
