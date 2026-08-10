"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assertSameOrigin, requireAuthenticatedAccountUser, setCurrentSessionOrganization } from "@/lib/auth/session";
import { getSystemPrisma } from "@/lib/db/prisma";

export type OnboardingState = { error?: string };
const reservedSlugs = new Set(["admin", "api", "app", "login", "cadastro", "support", "billing", "termos", "privacidade"]);
const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome do estabelecimento.").max(150),
  segment: z.string().trim().max(80).optional().transform((value) => value || null),
  phone: z.string().trim().max(30).optional().transform((value) => value || null),
  timezone: z.string().trim().min(3).max(80),
  firstService: z.string().trim().max(140).optional().transform((value) => value || null),
});

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

export async function completeOnboardingAction(_: OnboardingState, formData: FormData): Promise<OnboardingState> {
  await assertSameOrigin();
  const user = await requireAuthenticatedAccountUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };
  const baseSlug = slugify(parsed.data.name);
  if (!baseSlug || reservedSlugs.has(baseSlug)) return { error: "Escolha outro nome para o estabelecimento." };
  const prisma = getSystemPrisma();
  const existingMembership = await prisma.organizationMembership.findFirst({ where: { userId: user.id, isActive: true } });
  if (existingMembership) {
    await setCurrentSessionOrganization(user.sessionId, existingMembership.organizationId);
    redirect("/admin");
  }
  let suffix = 0;
  let slug = baseSlug;
  while (await prisma.organization.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix + 1}`;
  }
  const organization = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({ data: { name: parsed.data.name, slug, segment: parsed.data.segment, phone: parsed.data.phone, timezone: parsed.data.timezone } });
    const membership = await tx.organizationMembership.create({ data: { organizationId: created.id, userId: user.id, role: "OWNER" } });
    await tx.studioSettings.create({ data: { organizationId: created.id, studioName: created.name, timezone: created.timezone, phone: parsed.data.phone } });
    await tx.calendarResource.create({ data: { organizationId: created.id, membershipId: membership.id, name: "Agenda principal" } });
    await tx.subscription.create({ data: { organizationId: created.id, status: "FREE_BETA" } });
    if (parsed.data.firstService) await tx.service.create({ data: { organizationId: created.id, name: parsed.data.firstService, durationMinutes: 60, isActive: true } });
    await tx.auditLog.create({ data: { organizationId: created.id, userId: user.id, action: "ORGANIZATION_ONBOARDED", entityType: "Organization", entityId: created.id } });
    return created;
  });
  await setCurrentSessionOrganization(user.sessionId, organization.id);
  redirect("/admin?welcome=1");
}
