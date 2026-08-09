import Link from "next/link";

export default function AdminOfflinePage() {
  return (
    <main className="offline-page admin-offline-page">
      <p className="eyebrow">Sem conexão</p>
      <h1>A agenda precisa da internet para mostrar dados atualizados.</h1>
      <p>Nenhuma informação de clientes ou atendimentos foi armazenada neste aparelho. Reconecte e tente novamente.</p>
      <Link className="button button-primary" href="/admin">Tentar novamente</Link>
    </main>
  );
}
