"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateClientProfileAction, type ClientAuthState } from "../../actions";

type ClientProfile = { fullName: string; preferredName: string | null; whatsapp: string | null; contactPreference: "WHATSAPP" | "PHONE" | "EMAIL"; communicationAccepted: boolean };

export function ClientProfileForm({ client }: { client: ClientProfile }) {
  const [state, action, pending] = useActionState(updateClientProfileAction, {} as ClientAuthState);
  return <form action={action} className="editor-form client-profile-form"><div className="form-grid two-columns"><div className="field-group form-wide"><label htmlFor="fullName">Nome completo</label><input defaultValue={client.fullName} id="fullName" name="fullName" required /></div><div className="field-group"><label htmlFor="preferredName">Como prefere ser chamada</label><input defaultValue={client.preferredName ?? ""} id="preferredName" name="preferredName" /></div><div className="field-group"><label htmlFor="whatsapp">WhatsApp</label><input defaultValue={client.whatsapp ?? ""} id="whatsapp" name="whatsapp" required /></div><div className="field-group"><label htmlFor="contactPreference">Contato preferido</label><select defaultValue={client.contactPreference} id="contactPreference" name="contactPreference"><option value="WHATSAPP">WhatsApp</option><option value="PHONE">Telefone</option><option value="EMAIL">E-mail</option></select></div><label className="check-field form-wide"><input defaultChecked={client.communicationAccepted} name="communicationAccepted" type="checkbox" />Aceito receber lembretes e orientações sobre meus atendimentos.</label></div>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="form-success" role="status">{state.success}</p> : null}<button className="button button-primary" disabled={pending} type="submit"><Save size={17} />{pending ? "Salvando…" : "Salvar alterações"}</button></form>;
}
