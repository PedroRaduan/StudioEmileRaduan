"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function TimelineViewport({ children, initialMinute, pixelsPerMinute }: {
  children: ReactNode; initialMinute: number; pixelsPerMinute: number;
}) {
  const board = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Scroll only the grid, never the document or its date controls.
    board.current?.scrollTo({ top: Math.max(0, initialMinute * pixelsPerMinute - 12), behavior: "instant" });
  }, [initialMinute, pixelsPerMinute]);
  return <div className="timeline-board" data-timeline-board ref={board}>{children}</div>;
}
