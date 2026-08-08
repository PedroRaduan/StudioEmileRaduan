"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/auth/session";
import { getCurrentClient, requireClient } from "@/lib/client-auth/session";
import { confirmBookingHold } from "@/lib/client-booking/confirm";
import { BookingError, createBookingHold, releaseCurrentBookingHold } from "@/lib/client-booking/hold";

export type BookingState = { error?: string };
const holdSchema = z.object({ serviceId: z.string().cuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) });

export async function startBookingHoldAction(_: BookingState, formData: FormData): Promise<BookingState> {
  await assertSameOrigin();
  const parsed = holdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Escolha um horário disponível." };
  const current = await getCurrentClient();
  try {
    await createBookingHold({ ...parsed.data, clientId: current?.clientId });
  } catch (error) {
    return { error: error instanceof BookingError ? error.message : "Não foi possível reservar o horário. Tente novamente." };
  }
  redirect("/agendar/resumo");
}

export async function confirmBookingAction(_: BookingState, formData: FormData): Promise<BookingState> {
  await assertSameOrigin();
  const current = await requireClient();
  if (formData.get("policyAccepted") !== "on") return { error: "Leia e aceite a política para confirmar." };
  try {
    const appointment = await confirmBookingHold({ clientId: current.clientId });
    redirect(`/agendar/confirmado?appointment=${encodeURIComponent(appointment.id)}`);
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message };
    throw error;
  }
}

export async function releaseBookingAction() {
  await assertSameOrigin();
  await releaseCurrentBookingHold();
  redirect("/agendar");
}
