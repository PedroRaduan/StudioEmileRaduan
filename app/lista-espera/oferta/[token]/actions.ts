"use server";
import { redirect } from "next/navigation";
import { acceptWaitlistOffer, isWaitlistToken, WaitlistError } from "@/lib/admin/waitlist";
export type OfferState = { error?: string };
export async function acceptOfferAction(_: OfferState, formData: FormData): Promise<OfferState> { const token = String(formData.get("token") ?? ""); if (!isWaitlistToken(token)) return { error: "Esta oferta não é válida." }; try { const appointment = await acceptWaitlistOffer(token); redirect(`/agendar/confirmado?appointment=${appointment.id}`); } catch (error) { return { error: error instanceof WaitlistError ? error.message : "Não foi possível aceitar a oferta agora." }; } }
