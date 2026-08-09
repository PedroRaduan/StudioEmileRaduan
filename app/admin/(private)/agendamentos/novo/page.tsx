import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { getAppointmentFormData } from "@/lib/admin/agenda";
import { todayInTimezone } from "@/lib/date-time";
import { AppointmentForm } from "./appointment-form";

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const today = todayInTimezone();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : today;
  const data = await getAppointmentFormData();
  const ready = data.clients.length && data.services.length && data.resources.length;

  return (
    <main className="admin-page editor-page">
      <Link className="back-link" href={`/admin/agenda?date=${date}`}><ArrowLeft aria-hidden="true" size={17} /> Voltar para agenda</Link>
      <div className="editor-heading"><p className="eyebrow">Novo agendamento</p><h1>Reserve um horário.</h1><p>O sistema verificará automaticamente conflitos e disponibilidade antes de salvar.</p></div>
      <section className="editor-card">
        {ready ? <AppointmentForm {...data} date={date} minDate={today} /> : (
          <div className="setup-notice">
            <CalendarClock aria-hidden="true" size={24} />
            <h2>Antes de marcar o primeiro horário</h2>
            <p>Cadastre pelo menos uma cliente, um serviço e configure os horários de atendimento.</p>
            <div><Link href="/admin/clientes/novo">Cadastrar cliente</Link><Link href="/admin/servicos/novo">Criar serviço</Link><Link href="/admin/configuracoes/horarios">Configurar horários</Link></div>
          </div>
        )}
      </section>
    </main>
  );
}
