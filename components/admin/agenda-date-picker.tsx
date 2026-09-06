"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { isAgendaDate } from "@/lib/agenda/navigation";

export function AgendaDatePicker({ date, view }: { date: string; view: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div aria-busy={pending} className="agenda-date-picker">
      <label className="sr-only" htmlFor="agenda-date">Escolher data</label>
      <input
        defaultValue={date}
        key={`${date}-${view}`}
        disabled={pending}
        id="agenda-date"
        onChange={(event) => {
          const nextDate = event.currentTarget.value;
          if (!isAgendaDate(nextDate)) return;
          startTransition(() => router.push(`/admin/agenda?date=${nextDate}&view=${view}`, { scroll: false }));
        }}
        type="date"
      />
      {pending ? <span className="sr-only" role="status">Carregando a data escolhida</span> : null}
    </div>
  );
}
