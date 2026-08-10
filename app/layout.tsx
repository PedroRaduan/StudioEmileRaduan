import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FormValueGuard } from "@/components/form-value-guard";

export const viewport: Viewport = {
  themeColor: "#9A5B67",
  colorScheme: "light",
};

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = safeMetadataBase();

  return {
    metadataBase,
    title: {
      default: "Agenda — gestão de horários e clientes",
      template: "%s | Agenda",
    },
    description: "Organize horários, clientes e atendimento em uma plataforma feita para negócios de agenda.",
    applicationName: "Agenda",
    icons: {
      icon: "/icon-192.png",
      apple: "/icon-192.png",
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      title: "Agenda — gestão de horários e clientes",
      description: "Organize horários, clientes e atendimento em uma só plataforma.",
    },
    twitter: {
      card: "summary_large_image",
      title: "Agenda — gestão de horários e clientes",
      description: "Organize horários, clientes e atendimento em uma só plataforma.",
    },
  };
}

function safeMetadataBase() {
  const candidate = process.env.APP_URL;
  if (candidate) {
    try {
      const parsed = new URL(candidate);
      if ((parsed.protocol === "https:" || parsed.hostname === "localhost") && !parsed.username && !parsed.password) return parsed;
    } catch {
      // Usa o fallback local sem refletir cabeçalhos controlados pela requisição.
    }
  }
  return new URL("http://localhost:3000");
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
