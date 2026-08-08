import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3, MapPin, MessageCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { getPublicStudio, whatsappLink } from "@/lib/studio";

export const dynamic = "force-dynamic";

export default async function PublicHomePage() {
  const studio = await getPublicStudio();
  const whatsapp = studio.whatsapp
    ? whatsappLink(studio.whatsapp, "Olá, gostaria de conversar sobre um horário.")
    : null;

  return (
    <main style={{ "--rose": studio.primaryColor, "--rose-soft": studio.secondaryColor } as CSSProperties}>
      <header className="public-header">
        <a className="wordmark" href="#inicio" aria-label={`Início — ${studio.studioName}`}>
          <span>Emile Raduan</span>
          <small>Beauty Face</small>
        </a>
        <a className="header-link" href="#contato">Contato</a>
      </header>

      <section className="public-hero" id="inicio" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Atendimento com hora marcada</p>
          <h1 id="hero-title">Seu cuidado começa com uma conversa.</h1>
          <p className="hero-description">
            {studio.publicIntro ??
              "Para conhecer os procedimentos e verificar disponibilidade, fale diretamente com Emile pelo WhatsApp."}
          </p>
          <div className="public-hero-actions">
          {studio.onlineBookingEnabled ? <Link className="button button-primary" href="/agendar"><CalendarDays size={19} />Agendar on-line</Link> : whatsapp ? (
            <a className="button button-primary" href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle size={19} aria-hidden="true" />
              Conversar pelo WhatsApp
            </a>
          ) : (
            <span className="contact-pending">O canal de atendimento está sendo configurado.</span>
          )}
          {studio.onlineBookingEnabled && whatsapp ? <a className="secondary-action" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} />Tirar uma dúvida</a> : null}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-arc hero-arc-one" />
          <div className="hero-arc hero-arc-two" />
          <div className="hero-brow" />
          <span>ER</span>
        </div>
      </section>

      {studio.services.length > 0 ? (
        <section className="public-section services-section" aria-labelledby="services-title">
          <div className="section-heading">
            <p className="eyebrow">Procedimentos</p>
            <h2 id="services-title">Cuidados pensados para você.</h2>
          </div>
          <div className="service-list">
            {studio.services.map((service) => (
              <article className="service-row" key={service.id}>
                <div>
                  <h3>{service.name}</h3>
                  {service.shortDescription ? <p>{service.shortDescription}</p> : null}
                </div>
                <div className="service-meta">
                  <span><Clock3 size={16} aria-hidden="true" /> {service.durationMinutes} min</span>
                  {service.priceCents !== null ? <strong>{formatCurrency(service.priceCents)}</strong> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="public-section appointment-section" aria-labelledby="appointment-title">
        <div className="appointment-number">01</div>
        <div>
          <p className="eyebrow">Agendamento</p>
          <h2 id="appointment-title">{studio.onlineBookingEnabled ? "Escolha seu horário com tranquilidade." : "Horários são organizados pessoalmente."}</h2>
          <p>
            {studio.onlineBookingEnabled ? "Consulte a agenda em tempo real, escolha um serviço e confirme em poucos passos." : "A disponibilidade é confirmada diretamente por WhatsApp. Assim, cada atendimento recebe a atenção necessária antes de ser marcado."}
          </p>
          {studio.onlineBookingEnabled ? <Link className="text-link" href="/agendar">Ver horários disponíveis <ChevronRight size={17} /></Link> : whatsapp ? (
            <a className="text-link" href={whatsapp} target="_blank" rel="noreferrer">
              Iniciar conversa <ChevronRight size={17} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </section>

      <section className="public-section about-section" aria-labelledby="about-title">
        <p className="eyebrow">Sobre o studio</p>
        <h2 id="about-title">{studio.studioName}</h2>
        {studio.publicAbout ? <p>{studio.publicAbout}</p> : <p>Informações sobre o studio serão atualizadas em breve.</p>}
      </section>

      <footer className="public-footer" id="contato">
        <div>
          <p className="eyebrow">Contato</p>
          <h2>Vamos encontrar o melhor horário.</h2>
        </div>
        <div className="footer-contact">
          {whatsapp ? (
            <a className="button button-light" href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle size={19} aria-hidden="true" />
              Falar no WhatsApp
            </a>
          ) : null}
          {studio.addressLine1 ? (
            <p><MapPin size={17} aria-hidden="true" /> {studio.addressLine1}{studio.city ? ` · ${studio.city}` : ""}</p>
          ) : null}
          {studio.instagram ? <a href={instagramLink(studio.instagram)} target="_blank" rel="noreferrer">{studio.instagram.replace(/^@/, "@")} </a> : null}
        </div>
        <p className="footer-note"><CalendarDays size={16} aria-hidden="true" /> Atendimento mediante agendamento.</p>
      </footer>
    </main>
  );
}

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valueInCents / 100);
}

function instagramLink(handle: string) {
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}
