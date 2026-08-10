import type { ZodError } from "zod";

export type FieldErrors = Record<string, string>;

export function fieldErrorsFromZod(error: ZodError): FieldErrors {
  return error.issues.reduce<FieldErrors>((errors, issue) => {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
}
