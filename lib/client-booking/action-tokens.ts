import { randomBytes } from "node:crypto";
import type { AppointmentActionPurpose } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/hash";

const purposes: AppointmentActionPurpose[] = ["CONFIRM", "CANCEL", "RESCHEDULE"];

export async function createAppointmentActionLinks(appointmentId: string, origin: string) {
  const prisma = getPrisma();
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { startsAt: true } });
  if (!appointment || appointment.startsAt <= new Date()) return null;
  const rawTokens = purposes.map((purpose) => ({ purpose, raw: randomBytes(32).toString("base64url") }));
  await prisma.$transaction(async (tx) => {
    await tx.appointmentActionToken.deleteMany({ where: { appointmentId, usedAt: null } });
    await tx.appointmentActionToken.createMany({ data: rawTokens.map((item) => ({ appointmentId, purpose: item.purpose, tokenHash: sha256(item.raw), expiresAt: appointment.startsAt })) });
  });
  return Object.fromEntries(rawTokens.map((item) => [item.purpose, `${origin}/agendamento/acao/${item.raw}`])) as Record<AppointmentActionPurpose, string>;
}

export function validActionToken(rawToken: string) {
  return getPrisma().appointmentActionToken.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: { appointment: { include: { client: true, service: true } } },
  });
}
