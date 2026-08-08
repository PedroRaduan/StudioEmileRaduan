"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { headers } from "next/headers";
import { assertSameOrigin, requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { cancelAppointment, rescheduleAppointment } from "@/lib/agenda/update-appointment";
import { SchedulingError } from "@/lib/agenda/create-appointment";
import { formatDate, formatTime } from "@/lib/date-time";
import { createAppointmentActionLinks } from "@/lib/client-booking/action-tokens";

export type AppointmentActionState = { error?: string; success?: string };

const statusSchema = z.object({ appointmentId: z.string().cuid(), status: z.enum(["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_SERVICE", "COMPLETED", "NO_SHOW"]) });

export async function updateAppointmentStatusAction(formData: FormData) {
  await assertSameOrigin();
  const staff = await requirePermission("APPOINTMENTS_MANAGE");
  const parsed = statusSchema.parse(Object.fromEntries(formData));
  const prisma = getPrisma();
  const appointment = await prisma.appointment.findUnique({ where: { id: parsed.appointmentId } });
  if (!appointment) throw new Error("Agendamento não encontrado.");
  await prisma.$transaction([
    prisma.appointment.update({ where: { id: appointment.id }, data: { status: parsed.status, completedAt: parsed.status === "COMPLETED" ? new Date() : null } }),
    ...(parsed.status === "COMPLETED" ? [prisma.client.update({ where: { id: appointment.clientId }, data: { lastAppointmentAt: new Date(), status: "ACTIVE" } })] : []),
    prisma.appointmentEvent.create({ data: { appointmentId: appointment.id, actorUserId: staff.id, type: "STATUS_CHANGED", previousValue: { status: appointment.status }, nextValue: { status: parsed.status } } }),
    prisma.auditLog.create({ data: { userId: staff.id, action: "APPOINTMENT_STATUS_CHANGED", entityType: "Appointment", entityId: appointment.id, before: { status: appointment.status }, after: { status: parsed.status } } }),
  ]);
  refreshAppointment(appointment.id);
}

const paymentSchema = z.object({ appointmentId: z.string().cuid(), amount: z.string().min(1), method: z.enum(["CASH", "PIX", "CARD", "TRANSFER"]) });

export async function recordPaymentAction(formData: FormData) {
  await assertSameOrigin();
  const staff = await requirePermission("PAYMENTS_RECORD");
  const parsed = paymentSchema.parse(Object.fromEntries(formData));
  const amount = Math.round(Number(parsed.amount.replace(/\./g, "").replace(",", ".")) * 100);
  if (!Number.isInteger(amount) || amount < 0) throw new Error("Valor inválido.");
  const prisma = getPrisma();
  const appointment = await prisma.appointment.findUnique({ where: { id: parsed.appointmentId }, include: { payment: true } });
  if (!appointment?.payment) throw new Error("Pagamento não encontrado.");
  const status = appointment.payment.amountDueCents !== null && amount < appointment.payment.amountDueCents ? "PARTIALLY_PAID" : "PAID";
  await prisma.$transaction([
    prisma.payment.update({ where: { id: appointment.payment.id }, data: { amountPaidCents: amount, depositPaidCents: appointment.payment.depositAmountCents ? Math.min(amount, appointment.payment.depositAmountCents) : 0, method: parsed.method, status, confirmedByUserId: staff.id, confirmedAt: new Date(), events: { create: { type: "MANUALLY_RECORDED", previousValue: { amount: appointment.payment.amountPaidCents, status: appointment.payment.status }, nextValue: { amount, method: parsed.method, status } } } } }),
    prisma.appointment.update({ where: { id: appointment.id }, data: { paymentStatus: status } }),
    prisma.auditLog.create({ data: { userId: staff.id, action: "PAYMENT_RECORDED", entityType: "Payment", entityId: appointment.payment.id, before: { amount: appointment.payment.amountPaidCents, status: appointment.payment.status }, after: { amount, method: parsed.method, status } } }),
  ]);
  refreshAppointment(appointment.id);
}

const rescheduleSchema = z.object({
  appointmentId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido."),
  reason: z.string().trim().min(3, "Informe o motivo do reagendamento.").max(500),
});

export async function rescheduleAppointmentAction(_: AppointmentActionState, formData: FormData): Promise<AppointmentActionState> {
  await assertSameOrigin();
  const staff = await requirePermission("APPOINTMENTS_MANAGE");
  const parsed = rescheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise a nova data e o horário." };
  try {
    await rescheduleAppointment({ ...parsed.data, actorUserId: staff.id });
    refreshAppointment(parsed.data.appointmentId);
    return { success: "Agendamento reagendado e histórico atualizado." };
  } catch (error) {
    return { error: error instanceof SchedulingError ? error.message : "Não foi possível reagendar." };
  }
}

const cancellationSchema = z.object({ appointmentId: z.string().cuid(), reason: z.string().trim().min(3, "Informe o motivo do cancelamento.").max(500) });

export async function cancelAppointmentAction(_: AppointmentActionState, formData: FormData): Promise<AppointmentActionState> {
  await assertSameOrigin();
  const staff = await requirePermission("APPOINTMENTS_MANAGE");
  const parsed = cancellationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise o motivo do cancelamento." };
  try {
    await cancelAppointment({ ...parsed.data, actorUserId: staff.id });
    refreshAppointment(parsed.data.appointmentId);
    return { success: "Agendamento cancelado. O horário foi liberado." };
  } catch (error) {
    return { error: error instanceof SchedulingError ? error.message : "Não foi possível cancelar." };
  }
}

export async function prepareWhatsappAction(_: AppointmentActionState, formData: FormData): Promise<AppointmentActionState> {
  await assertSameOrigin();
  const staff = await requirePermission("APPOINTMENTS_MANAGE");
  const appointmentId = z.string().cuid().safeParse(formData.get("appointmentId"));
  if (!appointmentId.success) return { error: "Agendamento inválido." };
  const prisma = getPrisma();
  const [appointment, template, settings] = await Promise.all([
    prisma.appointment.findUnique({ where: { id: appointmentId.data }, include: { client: true, service: true } }),
    prisma.messageTemplate.findFirst({ where: { channel: "WHATSAPP", isActive: true, name: { contains: "confirma", mode: "insensitive" } }, orderBy: { updatedAt: "desc" } }),
    prisma.studioSettings.findUnique({ where: { id: "studio" } }),
  ]);
  if (!appointment?.client.whatsapp) return { error: "Cadastre o WhatsApp da cliente antes de preparar a mensagem." };
  const fallback = "Olá, {nome}. Seu horário para {servico} está marcado para {data}, às {horario}.";
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const links = await createAppointmentActionLinks(appointment.id, `${protocol}://${host}`);
  const sourceBody = template?.body ?? fallback;
  const containsActionVariables = ["{link_confirmar}", "{link_cancelar}", "{link_reagendar}"].some((variable) => sourceBody.includes(variable));
  const baseBody = sourceBody
    .replaceAll("{nome}", appointment.client.preferredName ?? appointment.client.fullName)
    .replaceAll("{servico}", appointment.service.name)
    .replaceAll("{data}", formatDate(appointment.startsAt, { day: "2-digit", month: "long" }))
    .replaceAll("{horario}", formatTime(appointment.startsAt))
    .replaceAll("{studio}", settings?.studioName ?? "Emile Raduan Beauty Face")
    .replaceAll("{link_confirmar}", links?.CONFIRM ?? "")
    .replaceAll("{link_cancelar}", links?.CANCEL ?? "")
    .replaceAll("{link_reagendar}", links?.RESCHEDULE ?? "");
  const body = links && !containsActionVariables ? `${baseBody}\n\nConfirmar: ${links.CONFIRM}\nCancelar: ${links.CANCEL}\nSolicitar reagendamento: ${links.RESCHEDULE}` : baseBody;
  await prisma.$transaction([
    prisma.messageLog.create({ data: { clientId: appointment.clientId, appointmentId: appointment.id, preparedByUserId: staff.id, channel: "WHATSAPP", status: "PREPARED", body } }),
    prisma.appointmentEvent.create({ data: { appointmentId: appointment.id, actorUserId: staff.id, type: "MESSAGE_PREPARED", channel: "WHATSAPP", nextValue: { body } } }),
    prisma.auditLog.create({ data: { userId: staff.id, action: "WHATSAPP_PREPARED", entityType: "Appointment", entityId: appointment.id } }),
  ]);
  refreshAppointment(appointment.id);
  return { success: "Mensagem preparada. Abra o WhatsApp e confirme manualmente o envio." };
}

export async function markWhatsappSentAction(formData: FormData) {
  await assertSameOrigin();
  const staff = await requirePermission("APPOINTMENTS_MANAGE");
  const messageId = z.string().cuid().parse(formData.get("messageId"));
  const message = await getPrisma().messageLog.findFirst({ where: { id: messageId, status: "PREPARED" } });
  if (!message?.appointmentId) throw new Error("Mensagem preparada não encontrada.");
  await getPrisma().$transaction([
    getPrisma().messageLog.update({ where: { id: message.id }, data: { status: "MANUALLY_SENT", sentAt: new Date() } }),
    getPrisma().appointmentEvent.create({ data: { appointmentId: message.appointmentId, actorUserId: staff.id, type: "MESSAGE_MANUALLY_SENT", channel: "WHATSAPP" } }),
    getPrisma().auditLog.create({ data: { userId: staff.id, action: "WHATSAPP_MANUALLY_SENT", entityType: "MessageLog", entityId: message.id } }),
  ]);
  refreshAppointment(message.appointmentId);
}

function refreshAppointment(id: string) {
  revalidatePath(`/admin/agendamentos/${id}`);
  revalidatePath("/admin/agenda");
  revalidatePath("/admin");
  revalidatePath("/admin/relatorios");
}
