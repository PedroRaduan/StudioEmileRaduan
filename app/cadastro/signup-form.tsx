"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction, type SignupState } from "./actions";

const initialState: SignupState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initialState);
  return <form action={action} className="saas-auth-form">
    <label>Seu nome<input autoComplete="name" name="name" required /></label>
    <label>E-mail de trabalho<input autoComplete="email" name="email" required type="email" /></label>
    <label>Senha<input autoComplete="new-password" name="password" required type="password" /><small>10+ caracteres, com maiúscula, minúscula e número.</small></label>
    <label>Confirme a senha<input autoComplete="new-password" name="confirmPassword" required type="password" /></label>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <button className="button button-primary" disabled={pending} type="submit">{pending ? "Criando conta…" : "Criar conta grátis"}</button>
    <p>Já usa o Agenda? <Link href="/login">Entrar</Link></p>
  </form>;
}
