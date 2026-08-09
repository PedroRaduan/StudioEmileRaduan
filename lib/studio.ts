import { getPrisma } from "@/lib/db/prisma";
import { CURRENT_STUDIO_ID, STUDIO_BRAND } from "@/lib/studio-config";

const fallback = {
  studioName: STUDIO_BRAND.name,
  primaryColor: STUDIO_BRAND.primaryColor,
  secondaryColor: STUDIO_BRAND.secondaryColor,
  publicIntro: null,
  publicAbout: null,
  whatsapp: null,
  instagram: null,
  addressLine1: null,
  city: null,
  onlineBookingEnabled: false,
  services: [] as { id: string; name: string; shortDescription: string | null; durationMinutes: number; priceCents: number | null }[],
};

export async function getPublicStudio() {
  if (!process.env.DATABASE_URL) return fallback;

  try {
    const prisma = getPrisma();
    const [settings, services] = await Promise.all([
      prisma.studioSettings.findUnique({ where: { id: CURRENT_STUDIO_ID } }),
      prisma.service.findMany({
        where: { isActive: true, isOnlineAvailable: true },
        select: { id: true, name: true, shortDescription: true, durationMinutes: true, priceCents: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      }),
    ]);

    return { ...fallback, ...settings, services };
  } catch {
    return fallback;
  }
}

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
