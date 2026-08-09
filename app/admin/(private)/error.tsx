"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="admin-page state-page" role="alert">
      <TriangleAlert aria-hidden="true" size={36} />
      <p className="eyebrow">Não foi possível carregar</p>
      <h1>Algo interrompeu esta tela.</h1>
      <p>Seus dados não foram alterados. Verifique a conexão e tente carregar novamente.</p>
      <button className="button button-primary" onClick={reset} type="button"><RotateCcw aria-hidden="true" size={17} /> Tentar novamente</button>
    </main>
  );
}
