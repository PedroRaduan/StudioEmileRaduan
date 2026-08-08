"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="login-form" noValidate>
      <div className="field-group">
        <label htmlFor="email">E-mail</label>
        <input autoComplete="email" id="email" name="email" type="email" required />
      </div>
      <div className="field-group">
        <label htmlFor="password">Senha</label>
        <input autoComplete="current-password" id="password" name="password" type="password" required />
      </div>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <button className="button button-primary login-submit" disabled={isPending} type="submit">
        <LogIn size={18} aria-hidden="true" />
        {isPending ? "Entrando…" : "Entrar na agenda"}
      </button>
    </form>
  );
}
