import { getSystemPrisma } from "../../lib/db/prisma";
import { runWithTenant } from "../../lib/tenancy/context";
import { createAppointment, SchedulingError } from "../../lib/agenda/create-appointment";
import { appointmentInput, ensure, futureDate, rawAppointment, type FixtureTenant } from "./fixtures";

export async function testAppointmentConcurrency(tenants: FixtureTenant[]) {
  const tenant = tenants[0];
  // Three independently committed races: equal starts, overlap and buffer-only overlap.
  for (const [index, times] of [["15:00", "15:00"], ["15:00", "15:30"], ["15:00", "16:00"]].entries()) {
    const date = futureDate(4 + index);
    const attempts = await Promise.allSettled(times.map((time, client) =>
      runWithTenant(tenant.context, () => createAppointment(appointmentInput(tenant, date, time, client)))));
    ensure(attempts.filter((attempt) => attempt.status === "fulfilled").length === 1, "Double booking: a corrida não produziu exatamente um vencedor.");
    const rejection = attempts.find((attempt) => attempt.status === "rejected");
    ensure(rejection?.status === "rejected" && rejection.reason instanceof SchedulingError &&
      rejection.reason.message === "Este horário acabou de ser ocupado. Escolha outro horário.",
    "A corrida falhou por motivo diferente de conflito de horário.");
    const day = rawAppointment(tenant, date).startsAt;
    const rows = await getSystemPrisma().appointment.findMany({ where: {
      organizationId: tenant.organization.id, resourceId: tenant.resource.id,
      startsAt: { gte: new Date(day.getTime() - 3600000), lt: new Date(day.getTime() + 7200000) },
    } });
    ensure(rows.length === 1, "O banco persistiu quantidade incorreta de agendamentos após a corrida.");
  }
  // Valid adjacent occupied windows must still work.
  const date = futureDate(8);
  await runWithTenant(tenant.context, () => createAppointment(appointmentInput(tenant, date, "15:00")));
  await runWithTenant(tenant.context, () => createAppointment(appointmentInput(tenant, date, "16:20", 1)));
  // Separate tenant/resource, same time: no global false conflict.
  await runWithTenant(tenants[1].context, () => createAppointment(appointmentInput(tenants[1], date, "15:00")));
  // Exercise PostgreSQL exclusion directly, bypassing the application's conflict lookup.
  const raw = rawAppointment(tenant, futureDate(10));
  const database = getSystemPrisma();
  await database.appointment.create({ data: raw });
  let excluded = false;
  try { await database.appointment.create({ data: { ...raw, code: raw.code + "-conflict" } }); }
  catch (error) {
    // Driver errors are checked but never printed: 23P01 is exclusion_violation.
    excluded = typeof error === "object" && error !== null && "meta" in error && JSON.stringify(error.meta).includes("23P01");
  }
  ensure(excluded, "PostgreSQL não rejeitou a sobreposição pela constraint de exclusão.");
}
