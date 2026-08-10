import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { STUDIO_BRAND } from "@/lib/studio-config";
import { FormValueGuard } from "@/components/form-value-guard";

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
      default: STUDIO_BRAND.name,
      template: `%s | ${STUDIO_BRAND.name}`,
    },
    description: "Agenda e cuidados personalizados.",
    applicationName: STUDIO_BRAND.name,
    icons: {
      icon: "/icon-192.png",
      apple: "/icon-192.png",
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      title: STUDIO_BRAND.name,
      description: "Agenda e cuidados personalizados.",
      images: [{ url: "/og.png", width: 1800, height: 1000, alt: STUDIO_BRAND.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: STUDIO_BRAND.name,
      description: "Agenda e cuidados personalizados.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="pt-BR">
      <body>
        <FormValueGuard />
        {children}
      </body>
    </html>
  );
}
