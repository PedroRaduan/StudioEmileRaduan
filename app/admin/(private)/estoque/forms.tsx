"use client";
import { useActionState, useState } from "react";
import { addInventoryItemAction, moveInventoryAction, type InventoryState } from "./actions";

function Feedback({ state }: { state: InventoryState }) {
  return <>{state.error ? <p role="alert" className="form-error">{state.error}</p> : null}{state.success ? <p role="status" className="form-success">{state.success}</p> : null}</>;
}
export function StockItemForm() {
  const [state, action, pending] = useActionState(addInventoryItemAction, {});
  return <form action={action} className="editor-form"><label>Nome do produto<input name="name" required minLength={2} maxLength={100} placeholder="Ex.: luvas, caixa" /></label><label>Avise quando restarem<input name="minimum" type="number" min={0} max={1000000} defaultValue={0} required /></label><Feedback state={state} /><button disabled={pending} className="button button-primary">{pending ? "Salvando…" : "Cadastrar produto"}</button></form>;
}
export function StockMovementForm({ items }: { items: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(moveInventoryAction, {} as InventoryState);
  const [initialKey] = useState(() => crypto.randomUUID());
  const [kind, setKind] = useState("PURCHASE");
  return <form action={action} className="editor-form"><input name="requestKey" type="hidden" value={state.requestKey ?? initialKey} /><label>Movimentação<select name="kind" value={kind} onChange={(event) => setKind(event.target.value)}><option value="PURCHASE">Compra · entrada no estoque</option><option value="USE">Uso · saída do estoque</option></select></label><label>Produto<select name="itemId" required>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Quantidade de unidades<input name="quantity" type="number" min={1} max={1000000} required /></label>{kind === "PURCHASE" ? <label>Valor total pago (R$)<input name="cost" inputMode="decimal" placeholder="0,00" required maxLength={10} /><small>Será registrado uma única vez nas despesas de hoje.</small></label> : <><input name="cost" type="hidden" value="0" /><p>O uso reduz o estoque, sem gerar uma nova despesa.</p></>}<Feedback state={state} /><button disabled={pending} className="button button-primary">{pending ? "Salvando…" : "Registrar movimentação"}</button></form>;
}
