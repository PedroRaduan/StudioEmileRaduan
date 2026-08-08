import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Emile Raduan Beauty Face",
    short_name: "Emile Raduan",
    description: "Agenda privada da Emile Raduan Beauty Face.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F3",
    theme_color: "#9A5B67",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
