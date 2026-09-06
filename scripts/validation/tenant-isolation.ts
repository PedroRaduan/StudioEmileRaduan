import { getPrisma, getSystemPrisma } from "../../lib/db/prisma";
import { runWithTenant } from "../../lib/tenancy/context";
import { createAppointment, SchedulingError } from "../../lib/agenda/create-appointment";
import { appointmentInput, ensure, type FixtureTenant } from "./fixtures";

async function denied(operation: () => PromiseLike<unknown>) {
  let blocked = false;
  try { await operation(); } catch (error) { blocked = error instanceof Error && error.name === "TenantAccessDeniedError"; }
  ensure(blocked, "Operação por ID de outro tenant não foi negada pela autorização.");
}

export async function testTenantIsolation(tenants: FixtureTenant[]) {
  const prisma = getPrisma();
  for (const [own, other] of [[tenants[0], tenants[1]], [tenants[1], tenants[0]]]) {
    const result = await runWithTenant(own.context, () => createAppointment(appointmentInput(own)));
    await runWithTenant(own.context, async () => {
      const key = { organizationId: own.organization.id, resourceId: own.resource.id, dayOfWeek: 0 };
      await prisma.availabilityRule.upsert({ where: { organizationId_resourceId_dayOfWeek: key },
        create: { ...key, startsAtMinute: 480, endsAtMinute: 1200 }, update: { isEnabled: false } });
      ensure((await prisma.availabilityRule.findUnique({ where: { organizationId_resourceId_dayOfWeek: key } }))?.isEnabled === false, "Alteração de dia semanal não persistiu.");
      await prisma.availabilityRule.update({ where: { organizationId_resourceId_dayOfWeek: key }, data: { isEnabled: true } });
    });
    await runWithTenant(other.context, async () => {
      const id = own.clients[0].id;
      // Positive control prevents a broken/empty connection from masquerading as isolation.
      ensure(await prisma.client.findUnique({ where: { id: other.clients[0].id } }), "O tenant não consegue ler seu próprio cliente.");
      ensure(await prisma.client.findUnique({ where: { id } }) === null, "Cliente vazou entre tenants.");
      ensure(await prisma.service.findUnique({ where: { id: own.service.id } }) === null, "Serviço vazou entre tenants.");
      ensure(await prisma.appointment.findUnique({ where: { id: result.appointment.id } }) === null, "Agendamento vazou entre tenants.");
      ensure((await prisma.client.findMany({ where: { organizationId: own.organization.id } })).length === 0, "Filtro de organizationId fornecido pelo chamador permitiu vazamento.");
      ensure((await prisma.client.updateMany({ where: { id }, data: { fullName: "Alteração indevida" } })).count === 0, "Update em lote cruzou tenants.");
      ensure((await prisma.client.deleteMany({ where: { id } })).count === 0, "Delete em lote cruzou tenants.");
      await denied(() => prisma.client.update({ where: { id }, data: { fullName: "Alteração indevida" } }));
      await denied(() => prisma.client.delete({ where: { id } }));
      await denied(() => prisma.service.update({ where: { id: own.service.id }, data: { name: "Alteração indevida" } }));
      await denied(() => prisma.service.delete({ where: { id: own.service.id } }));
      await denied(() => prisma.appointment.update({ where: { id: result.appointment.id }, data: { status: "CANCELED" } }));
      await denied(() => prisma.appointment.delete({ where: { id: result.appointment.id } }));
      // Domain checks must reject foreign client, service and resource independently.
      for (const foreign of [
        { clientId: own.clients[0].id }, { serviceId: own.service.id }, { resourceId: own.resource.id },
      ]) {
        let blocked = false;
        try { await createAppointment({ ...appointmentInput(other, undefined, "10:00"), ...foreign }); }
        catch (error) { blocked = error instanceof SchedulingError; }
        ensure(blocked, "Criação de agendamento aceitou relacionamento de outra empresa.");
      }
    });
    const stored = await getSystemPrisma().appointment.findUnique({ where: { id: result.appointment.id } });
    ensure(stored?.status === "SCHEDULED" && stored.organizationId === own.organization.id, "Recurso foi alterado durante tentativa cruzada.");
    const client = await getSystemPrisma().client.findUnique({ where: { id: own.clients[0].id } });
    const service = await getSystemPrisma().service.findUnique({ where: { id: own.service.id } });
    ensure(client?.fullName === own.clients[0].fullName && service?.name === own.service.name, "Cliente ou serviço protegido foi modificado.");
  }
}
