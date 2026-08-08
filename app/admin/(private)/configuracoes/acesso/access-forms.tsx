"use client";

import { useActionState } from "react";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { finalizeOwnerAccessAction, removeTemporaryOwnerAction, type AccountAccessState } from "./actions";

export function FinalizeAccessForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(finalizeOwnerAccessAction, {} as AccountAccessState);
  return <form action={action} className="editor-form"><div className="form-grid two-columns"><div className="field-group"><label htmlFor="final-name">Nome</label><input defaultValue={name} id="final-name" name="name" required /></div><div className="field-group"><label htmlFor="final-email">E-mail</label><input defaultValue={email} id="final-email" name="email" required type="email" /></div><div className="field-group form-wide"><label htmlFor="currentPassword">Senha temporária atual</label><input autoComplete="current-password" id="currentPassword" name="currentPassword" required type="password" /></div><div className="field-group"><label htmlFor="newPassword">Nova senha definitiva</label><input aria-describedby="final-password-hint" autoComplete="new-password" id="newPassword" name="password" required type="password" /><small id="final-password-hint">Mínimo de 12 caracteres, com maiúscula, minúscula, número e símbolo.</small></div><div className="field-group"><label htmlFor="confirmPassword">Confirmar nova senha</label><input autoComplete="new-password" id="confirmPassword" name="confirmPassword" required type="password" /></div><label className="check-field form-wide"><input name="termsAccepted" required type="checkbox" />Confirmo os termos de administração e a responsabilidade por este acesso definitivo.</label></div>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="button button-primary" disabled={pending} type="submit"><ShieldCheck size={17} />{pending ? "Protegendo…" : "Tornar acesso definitivo"}</button></form>;
}

export function RemoveTemporaryAccessForm() {
  const [state, action, pending] = useActionState(removeTemporaryOwnerAction, {} as AccountAccessState);
  return <form action={action} className="editor-form compact-form" onSubmit={(event) => { if (!window.confirm("Remover este acesso temporário? Os dados da agenda serão preservados, mas será necessário criar outro acesso para entrar.")) event.preventDefault(); }}><div className="field-group"><label htmlFor="remove-password">Senha atual</label><input autoComplete="current-password" id="remove-password" name="currentPassword" required type="password" /></div><div className="field-group"><label htmlFor="remove-confirmation">Digite REMOVER ACESSO</label><input autoComplete="off" id="remove-confirmation" name="confirmation" required /></div>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<button className="button button-danger" disabled={pending} type="submit"><Trash2 size={17} />{pending ? "Removendo…" : "Remover acesso temporário"}</button></form>;
}

export function PermanentAccessNotice() {
  return <div className="permanent-access-notice"><KeyRound size={21} /><div><strong>Este acesso já é definitivo.</strong><p>Alterações futuras de e-mail, senha e autenticação poderão ser feitas nesta área.</p></div></div>;
}
