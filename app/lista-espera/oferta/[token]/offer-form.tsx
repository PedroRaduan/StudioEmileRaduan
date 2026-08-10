"use client";
import { useActionState } from "react";
import { acceptOfferAction, type OfferState } from "./actions";
const initialState: OfferState = {};
export function OfferForm({ token }: { token: string }) { const [state, action, pending] = useActionState(acceptOfferAction, initialState); return <form action={action} className="saas-auth-form"><input name="token" type="hidden" value={token} />{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<button className="button button-primary" disabled={pending}>{pending ? "Confirmando…" : "Aceitar esta vaga"}</button><p>Ao aceitar, este horário será confirmado para você.</p></form>; }
