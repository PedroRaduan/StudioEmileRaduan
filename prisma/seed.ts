import "dotenv/config";
import { getPrisma } from "../lib/db/prisma";

async function main() {
  const prisma = getPrisma();
  await prisma.studioSettings.upsert({
    where: { id: "studio" },
    create: { id: "studio", studioName: "Emile Raduan Beauty Face", timezone: "America/Sao_Paulo", onlineBookingEnabled: false },
    update: {},
  });

  const resource = await prisma.calendarResource.findFirst({ where: { isActive: true } });
  if (!resource) await prisma.calendarResource.create({ data: { name: "Agenda principal" } });

  console.info("Base inicial configurada sem clientes, serviços ou agendamentos.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Não foi possível inicializar o banco.");
  process.exitCode = 1;
});
