"use client";

import { useEffect, useState } from "react";

export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
  useEffect(() => { const timer = window.setInterval(() => setSeconds(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))), 1000); return () => window.clearInterval(timer); }, [expiresAt]);
  return <span className={seconds < 60 ? "hold-countdown urgent" : "hold-countdown"} role="timer">{seconds > 0 ? `Reserva por ${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}` : "Reserva expirada"}</span>;
}
