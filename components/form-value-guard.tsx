"use client";

import { useEffect } from "react";

type ControlSnapshot = { checked?: boolean; name: string; value: string };

function isRestorableControl(element: Element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
}

function capture(form: HTMLFormElement) {
  return Array.from(form.elements)
    .filter(isRestorableControl)
    .filter((element) => element.name && element.type !== "file")
    .map((element) => ({
      name: element.name,
      value: element.value,
      ...(element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type) ? { checked: element.checked } : {}),
    }));
}

function restore(form: HTMLFormElement, values: ControlSnapshot[]) {
  const controls = Array.from(form.elements).filter(isRestorableControl);
  values.forEach((snapshot, index) => {
    const matching = controls.filter((control) => control.name === snapshot.name);
    const control = matching[index] ?? matching[0];
    if (!control) return;
    if (control instanceof HTMLInputElement && snapshot.checked !== undefined) control.checked = snapshot.checked;
    else control.value = snapshot.value;
  });
}

/** Mantém o preenchimento quando uma Server Action devolve erro de validação. */
export function FormValueGuard() {
  useEffect(() => {
    const submissions = new WeakMap<HTMLFormElement, ControlSnapshot[]>();
    const onSubmit = (event: Event) => {
      const form = event.target;
      if (form instanceof HTMLFormElement) submissions.set(form, capture(form));
    };
    const onReset = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const values = submissions.get(form);
      if (!values) return;
      event.preventDefault();
      queueMicrotask(() => restore(form, values));
    };
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("reset", onReset, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("reset", onReset, true);
    };
  }, []);

  return null;
}
