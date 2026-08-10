import { STUDIO_BRAND } from "@/lib/studio-config";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    id: "/admin/",
    name: STUDIO_BRAND.adminAppName,
    short_name: STUDIO_BRAND.adminAppShortName,
    description: `Agenda administrativa da ${STUDIO_BRAND.name}.`,
    // O start_url precisa estar dentro de scope. Sem a barra final, o Chrome
    // considera /admin fora de /admin/ e ignora o escopo restrito do PWA.
    start_url: "/admin/",
    scope: "/admin/",
    display: "standalone",
    background_color: STUDIO_BRAND.backgroundColor,
    theme_color: STUDIO_BRAND.primaryColor,
    lang: "pt-BR",
    orientation: "any",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Agenda de hoje", short_name: "Agenda", url: "/admin/agenda", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Novo agendamento", short_name: "Novo horário", url: "/admin/agendamentos/novo", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Clientes", short_name: "Clientes", url: "/admin/clientes", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  }, {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}
