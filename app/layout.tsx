import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const viewport: Viewport = {
  themeColor: "#9A5B67",
  colorScheme: "light",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: {
      default: "Emile Raduan Beauty Face",
      template: "%s | Emile Raduan Beauty Face",
    },
    description: "Agenda e cuidados personalizados.",
    applicationName: "Emile Raduan Beauty Face",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/icon-192.png",
      apple: "/icon-192.png",
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      title: "Emile Raduan Beauty Face",
      description: "Agenda e cuidados personalizados.",
      images: [{ url: "/og.png", width: 1800, height: 1000, alt: "Emile Raduan Beauty Face" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Emile Raduan Beauty Face",
      description: "Agenda e cuidados personalizados.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
