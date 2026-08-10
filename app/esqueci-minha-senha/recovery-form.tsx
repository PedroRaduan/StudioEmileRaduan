"use client";
import Link from "next/link";
import { useActionState } from "react";
import { requestAccountRecoveryAction, type RecoveryState } from "./actions";
const initial: RecoveryState = {};
export function AccountRecoveryForm() { const [state, action, pending] = useActionState(requestAccountRecoveryAction, initial); return <form action={action} className="saas-auth-form"><label>E-mail<input autoComplete="email" name="email" required type="email" /></label>{state.error ? <p className="form-error">{state.error}</p> : null}{state.success ? <p className="form-success">{state.success}</p> : null}<button className="button button-primary" disabled={pending}>{pending ? "Enviando…" : "Enviar instruções"}</button><p><Link href="/login">Voltar para entrar</Link></p></form>; }
