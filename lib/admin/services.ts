import { getPrisma } from "@/lib/db/prisma";

export function listServices() {
  return getPrisma().service.findMany({ orderBy: [{ isActive: "desc" }, { displayOrder: "asc" }, { name: "asc" }] });
}
