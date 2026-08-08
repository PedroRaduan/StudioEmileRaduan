import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <p className="eyebrow">Sem conexão</p>
      <h1>Não foi possível carregar esta página.</h1>
      <p>Verifique sua internet e tente novamente. Seus dados privados não ficam armazenados neste aparelho.</p>
      <Link className="button button-primary" href="/">Tentar novamente</Link>
    </main>
  );
}
