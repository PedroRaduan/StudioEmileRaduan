"use client";
import { useActionState } from "react";
import { completeOnboardingAction, type OnboardingState } from "./actions";
const initialState: OnboardingState = {};
export function OnboardingForm() {
  const [state, action, pending] = useActionState(completeOnboardingAction, initialState);
  return <form action={action} className="saas-auth-form"><p className="onboarding-progress">Passo 1 de 3 · Seu negócio</p><label>Nome do estabelecimento<input name="name" required /></label><label>Segmento <span>opcional</span><input name="segment" placeholder="Ex.: Estética, barbearia, studio" /></label><label>Telefone <span>opcional</span><input name="phone" inputMode="tel" /></label><label>Fuso horário<select defaultValue="America/Sao_Paulo" name="timezone"><option value="America/Sao_Paulo">Brasília (GMT−3)</option></select></label><label>Primeiro serviço <span>opcional</span><input name="firstService" placeholder="Ex.: Design de sobrancelhas" /></label>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<button className="button button-primary" disabled={pending} type="submit">{pending ? "Preparando…" : "Concluir e abrir agenda"}</button></form>;
}
