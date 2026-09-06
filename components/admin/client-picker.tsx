"use client";

import { useEffect, useState } from "react";
import { searchClientsAction } from "@/app/admin/(private)/clientes/search-action";

type Client = { id: string; fullName: string; preferredName: string | null };

export function ClientPicker({ clients, selectedClientId }: { clients: Client[]; selectedClientId?: string }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(clients.find((client) => client.id === selectedClientId));
  const [result, setResult] = useState<{ query: string; clients: Client[]; error?: boolean }>({ query: "", clients: [] });
  const term = query.trim();
  useEffect(() => {
    if (term.length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      searchClientsAction(term).then((matches) => { if (active) setResult({ query: term, clients: matches }); })
        .catch(() => { if (active) setResult({ query: term, clients: [], error: true }); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [term]);
  const loading = term.length >= 2 && result.query !== term;
  const matches = term.length < 2 ? clients.slice(0, 20) : result.query === term ? result.clients : [];
  const options = selected && !matches.some((client) => client.id === selected.id) ? [selected, ...matches] : matches;
  return <div className="client-picker">
    <input aria-label="Pesquisar cliente pelo nome" autoComplete="off" maxLength={100} placeholder="Digite o nome da cliente…" value={query} onChange={(event) => setQuery(event.target.value)} type="search" />
    <select id="clientId" name="clientId" required value={selected?.id ?? ""} onChange={(event) => setSelected(options.find((client) => client.id === event.target.value))}>
      <option value="" disabled>Selecione a cliente encontrada</option>{options.map((client) => <option key={client.id} value={client.id}>{client.preferredName ? `${client.preferredName} · ${client.fullName}` : client.fullName}</option>)}
    </select>
    <small role="status">{loading ? "Buscando…" : term.length >= 2 && result.error ? "Não foi possível pesquisar. Tente novamente." : term.length >= 2 && !matches.length ? "Nenhuma cliente encontrada." : "Digite pelo menos 2 letras para buscar em todos os cadastros."}</small>
  </div>;
}
