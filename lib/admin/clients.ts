import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/session";

export async function listClients(query?: string) {
  await requirePermission("CLIENTS_MANAGE");
  const search = query?.trim();
  return getPrisma().client.findMany({
    where: {
      deletedAt: null,
      ...(search ? { OR: [
        { fullName: { contains: search, mode: "insensitive" } }, { preferredName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } }, { whatsapp: { contains: search } }, { email: { contains: search, mode: "insensitive" } }, { cpf: { contains: search } },
      ] } : {}),
    },
    select: {
      id: true, fullName: true, preferredName: true, whatsapp: true, phone: true, email: true,
      lastAppointmentAt: true, status: true, _count: { select: { appointments: true } },
    },
    orderBy: [{ lastAppointmentAt: "desc" }, { fullName: "asc" }],
    take: 100,
  });
}

export async function getClientProfile(id: string) {
  await requirePermission("CLIENTS_MANAGE");
  return getPrisma().client.findFirst({
    where: { id, deletedAt: null },
    include: {
      notes: { orderBy: { createdAt: "desc" }, take: 10 },
      appointments: { include: { service: true, events: { orderBy: { createdAt: "desc" }, take: 8 }, payment: true }, orderBy: { startsAt: "desc" }, take: 25 },
      messages: { orderBy: { createdAt: "desc" }, take: 10 },
      healthProfile: true,
      consents: { include: { document: true }, orderBy: { grantedAt: "desc" }, take: 20 },
      privacyRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      account: true,
      recoveryRequests: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
}
