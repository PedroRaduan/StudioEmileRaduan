"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { assertSameOrigin, hashIp } from "@/lib/auth/session";
import { getCurrentClient } from "@/lib/client-auth/session";
import { confirmBookingHold } from "@/lib/client-booking/confirm";
import { BookingError, createBookingHold, releaseCurrentBookingHold } from "@/lib/client-booking/hold";
import { allowPublicMutation } from "@/lib/security/public-rate-limit";

export type BookingState = { error?: string };
const holdSchema = z.object({ serviceId: z.string().cuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) });
const guestSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome completo.").max(150),
  whatsapp: z.string().trim().regex(/^\+?[\d\s().-]{10,20}$/, "Informe um WhatsApp válido."),
  email: z.union([z.literal(""), z.string().trim().email("Informe um e-mail válido.").max(254)]).transform((value) => value || null),
  dataAccepted: z.literal("on", { errorMap: () => ({ message: "Autorize o uso dos dados para confirmar seu horário." }) }),
});

export async function startBookingHoldAction(_: BookingState, formData: FormData): Promise<BookingState> {
  await assertSameOrigin();
  const parsed = holdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Escolha um horário disponível." };
  const requestHeaders = await headers();
  if (!await allowPublicMutation({ action: "booking_hold", ipHash: hashIp(requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip")), limit: 12 })) return { error: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente." };
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
  if (formData.get("policyAccepted") !== "on") return { error: "Leia e aceite a política para confirmar." };
  const current = await getCurrentClient();
  const guest = current ? null : guestSchema.safeParse(Object.fromEntries(formData));
  if (guest && !guest.success) return { error: guest.error.issues[0]?.message ?? "Revise seus dados para confirmar." };
  const requestHeaders = await headers();
  if (!await allowPublicMutation({ action: "booking_confirm", ipHash: hashIp(requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip")), limit: 6 })) return { error: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente." };
  try {
    const appointment = await confirmBookingHold({ clientId: current?.clientId, guest: guest?.data ? { fullName: guest.data.fullName, whatsapp: guest.data.whatsapp, email: guest.data.email } : undefined });
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
