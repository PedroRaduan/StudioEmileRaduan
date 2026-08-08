"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { assertSameOrigin } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/hash";

export type LinkActionState = { error?: string; success?: string };

export async function processAppointmentLinkAction(_: LinkActionState, formData: FormData): Promise<LinkActionState> {
  await assertSameOrigin();
  const rawToken = String(formData.get("token") ?? "");
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(rawToken)) return { error: "Este link não é válido." };
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  const prisma = getPrisma();
  try {
    return await prisma.$transaction(async (tx) => {
      const token = await tx.appointmentActionToken.findUnique({ where: { tokenHash: sha256(rawToken) }, include: { appointment: { include: { payment: true } } } });
      if (!token || token.usedAt || token.expiresAt <= new Date()) return { error: "Este link expirou ou já foi utilizado. Fale com o studio para receber ajuda." };
      const appointment = token.appointment;
      if (["COMPLETED", "CANCELED", "NO_SHOW"].includes(appointment.status)) return { error: "Este agendamento não permite mais essa alteração." };
      const settings = await tx.studioSettings.findUnique({ where: { id: "studio" } });
      const hoursUntil = (appointment.startsAt.getTime() - Date.now()) / (60 * 60 * 1000);

      if (token.purpose === "CONFIRM") {
        await tx.appointment.update({ where: { id: appointment.id }, data: { status: "CONFIRMED" } });
        await tx.appointmentEvent.create({ data: { appointmentId: appointment.id, type: "CLIENT_CONFIRMED", channel: "CLIENT_LINK", previousValue: { status: appointment.status }, nextValue: { status: "CONFIRMED" } } });
      } else if (token.purpose === "CANCEL") {
        if (hoursUntil < (settings?.cancellationHours ?? 24)) return { error: "O prazo para cancelamento on-line terminou. Fale diretamente com o studio." };
        if (reason.length < 3) return { error: "Conte brevemente o motivo do cancelamento." };
        const paymentStatus = appointment.payment && appointment.payment.amountPaidCents === 0 ? "CANCELED" as const : appointment.paymentStatus;
        await tx.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELED", cancelledAt: new Date(), cancellationReason: reason, paymentStatus } });
        if (appointment.payment && appointment.payment.amountPaidCents === 0) await tx.payment.update({ where: { id: appointment.payment.id }, data: { status: "CANCELED", events: { create: { type: "CANCELED_WITH_APPOINTMENT", previousValue: { status: appointment.payment.status }, nextValue: { status: "CANCELED" } } } } });
        await tx.appointmentEvent.create({ data: { appointmentId: appointment.id, type: "CLIENT_CANCELED", channel: "CLIENT_LINK", reason, previousValue: { status: appointment.status }, nextValue: { status: "CANCELED", paymentStatus } } });
      } else {
        if (hoursUntil < (settings?.rescheduleHours ?? 24)) return { error: "O prazo para solicitar reagendamento on-line terminou. Fale diretamente com o studio." };
        if (reason.length < 3) return { error: "Informe o motivo e, se desejar, os melhores dias ou períodos." };
        const requests = await tx.appointmentEvent.count({ where: { appointmentId: appointment.id, type: "CLIENT_RESCHEDULE_REQUESTED" } });
        if (requests >= (settings?.maxClientReschedules ?? 1)) return { error: "O limite de solicitações on-line foi atingido. Fale diretamente com o studio." };
        await tx.appointmentEvent.create({ data: { appointmentId: appointment.id, type: "CLIENT_RESCHEDULE_REQUESTED", channel: "CLIENT_LINK", reason, previousValue: { startsAt: appointment.startsAt.toISOString() }, nextValue: { pendingStudioContact: true } } });
      }
      const consumed = await tx.appointmentActionToken.updateMany({ where: { id: token.id, usedAt: null }, data: { usedAt: new Date() } });
      if (consumed.count !== 1) throw new Error("TOKEN_ALREADY_USED");
      await tx.auditLog.create({ data: { action: `CLIENT_LINK_${token.purpose}`, entityType: "Appointment", entityId: appointment.id } });
      if (token.purpose === "CONFIRM") return { success: "Presença confirmada. O studio já pode ver sua confirmação." };
      if (token.purpose === "CANCEL") return { success: "Agendamento cancelado. O horário foi liberado na agenda." };
      return { success: "Solicitação registrada. O horário atual permanece reservado até o studio concluir o reagendamento com você." };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "TOKEN_ALREADY_USED") return { error: "Este link já foi utilizado." };
    return { error: "Não foi possível concluir agora. Tente novamente ou fale com o studio." };
  }
}
