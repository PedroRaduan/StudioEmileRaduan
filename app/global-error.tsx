"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unexpected application error", { digest: error.digest });
  }, [error.digest]);

  return <html lang="pt-BR"><body><main className="global-error-page"><p>Algo saiu do esperado.</p><h1>Não conseguimos abrir esta página agora.</h1><span>Se o problema continuar, tente novamente em alguns instantes.</span><button onClick={reset} type="button">Tentar novamente</button></main></body></html>;
}
