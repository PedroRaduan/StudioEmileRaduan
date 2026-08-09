import { randomUUID } from "node:crypto";
import { createAppointment, SchedulingError } from "../lib/agenda/create-appointment";
import { dateInTimezone, todayInTimezone, weekdayInTimezone } from "../lib/date-time";
import { getPrisma } from "../lib/db/prisma";

const prisma = getPrisma();
const suffix = randomUUID().slice(0, 8);
const createdAppointmentIds: string[] = [];
let resourceId: string | undefined;
let serviceId: string | undefined;
const clientIds: string[] = [];

try {
  const owner = await prisma.user.findFirst({ where: { role: "OWNER", isActive: true } });
  if (!owner) throw new Error("Crie uma administradora local antes de executar o teste de integração.");

  const date = addCalendarDays(todayInTimezone(), 2);
  const time = "15:00";
  const startsAt = dateInTimezone(date, time);
  const weekday = weekdayInTimezone(startsAt);

  const resource = await prisma.calendarResource.create({ data: { name: `Teste concorrência ${suffix}` } });
  resourceId = resource.id;
  await prisma.availabilityRule.create({ data: { resourceId, dayOfWeek: weekday, startsAtMinute: 8 * 60, endsAtMinute: 20 * 60, isEnabled: true } });

  const service = await prisma.service.create({ data: { name: `Serviço concorrência ${suffix}`, durationMinutes: 60, maxAdvanceDays: 365 } });
  serviceId = service.id;
  const clients = await Promise.all([1, 2].map((number) => prisma.client.create({ data: { fullName: `Cliente concorrência ${number} ${suffix}` } })));
  clientIds.push(...clients.map((client) => client.id));

  const attempts = await Promise.allSettled(clients.map((client) => createAppointment({
    clientId: client.id,
    serviceId: service.id,
    resourceId: resource.id,
    date,
    time,
    ownerId: owner.id,
    requestKey: randomUUID(),
  })));
  const fulfilled = attempts.filter((attempt): attempt is PromiseFulfilledResult<Awaited<ReturnType<typeof createAppointment>>> => attempt.status === "fulfilled");
  const rejected = attempts.filter((attempt): attempt is PromiseRejectedResult => attempt.status === "rejected");
  createdAppointmentIds.push(...fulfilled.map((attempt) => attempt.value.id));

  if (fulfilled.length !== 1 || rejected.length !== 1 || !(rejected[0].reason instanceof SchedulingError)) {
    const rejection = rejected[0]?.reason;
    const code = typeof rejection === "object" && rejection !== null && "code" in rejection ? String(rejection.code) : "sem código";
    const diagnostic = rejection instanceof Error ? `${rejection.name} (${code}): ${rejection.message}` : String(rejection);
    throw new Error(`Resultado inesperado: ${fulfilled.length} criação(ões), ${rejected.length} rejeição(ões); rejeição: ${diagnostic}`);
  }

  console.info("PASSOU: duas tentativas simultâneas produziram um único agendamento.");
} finally {
  if (createdAppointmentIds.length) await prisma.appointment.deleteMany({ where: { id: { in: createdAppointmentIds } } });
  if (clientIds.length) await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
  if (serviceId) await prisma.service.deleteMany({ where: { id: serviceId } });
  if (resourceId) await prisma.calendarResource.deleteMany({ where: { id: resourceId } });
  if (createdAppointmentIds.length) await prisma.auditLog.deleteMany({ where: { entityId: { in: createdAppointmentIds } } });
  await prisma.$disconnect();
}

function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
