import { randomUUID } from "node:crypto";
import { getPrisma, getSystemPrisma } from "../lib/db/prisma";
import { runWithTenant } from "../lib/tenancy/context";

const systemPrisma = getSystemPrisma();
const suffix = randomUUID().slice(0, 10);
const primaryMembership = await systemPrisma.organizationMembership.findFirst({
  where: { role: "OWNER", isActive: true, organization: { isActive: true }, user: { isActive: true } },
  orderBy: { createdAt: "asc" },
});

if (!primaryMembership) throw new Error("Crie uma administradora local antes de executar o teste de isolamento.");

let secondaryOrganizationId: string | undefined;
let secondaryMembershipId: string | undefined;
let clientId: string | undefined;

try {
  const secondaryOrganization = await systemPrisma.organization.create({
    data: { name: `Organização de teste ${suffix}`, slug: `teste-isolamento-${suffix}` },
  });
  secondaryOrganizationId = secondaryOrganization.id;
  const secondaryMembership = await systemPrisma.organizationMembership.create({
    data: { organizationId: secondaryOrganization.id, userId: primaryMembership.userId, role: "OWNER" },
  });
  secondaryMembershipId = secondaryMembership.id;

  const client = await runWithTenant({
    organizationId: primaryMembership.organizationId,
    membershipId: primaryMembership.id,
    role: primaryMembership.role,
  }, () => getPrisma().client.create({ data: { fullName: `Cliente protegido ${suffix}` } }));
  clientId = client.id;

  await runWithTenant({
    organizationId: secondaryOrganization.id,
    membershipId: secondaryMembership.id,
    role: secondaryMembership.role,
  }, async () => {
    const prisma = getPrisma();
    const readAttempt = await prisma.client.findUnique({ where: { id: client.id } });
    if (readAttempt !== null) throw new Error("A organização B leu um cliente da organização A.");

    for (const operation of [
      () => prisma.client.update({ where: { id: client.id }, data: { fullName: "Alteração indevida" } }),
      () => prisma.client.delete({ where: { id: client.id } }),
    ]) {
      await operation().then(
        () => { throw new Error("A organização B alterou um recurso da organização A."); },
        (error: unknown) => {
          if (!(error instanceof Error) || error.name !== "TenantAccessDeniedError") throw error;
        },
      );
    }
  });

  const persisted = await systemPrisma.client.findUnique({ where: { id: client.id }, select: { fullName: true, organizationId: true } });
  if (!persisted || persisted.fullName !== `Cliente protegido ${suffix}` || persisted.organizationId !== primaryMembership.organizationId) {
    throw new Error("O recurso protegido foi alterado ou perdeu o tenant original.");
  }

  console.info("PASSOU: organização B não conseguiu ler, atualizar nem excluir um cliente da organização A.");
} finally {
  if (clientId) await systemPrisma.client.deleteMany({ where: { id: clientId } });
  if (secondaryMembershipId) await systemPrisma.organizationMembership.deleteMany({ where: { id: secondaryMembershipId } });
  if (secondaryOrganizationId) await systemPrisma.organization.deleteMany({ where: { id: secondaryOrganizationId } });
  await systemPrisma.$disconnect();
}
