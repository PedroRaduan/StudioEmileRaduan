import { z } from "zod";

export const strongPasswordSchema = z.string()
  .min(12, "Use pelo menos 12 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.")
  .regex(/[a-z]/, "Inclua uma letra minúscula.")
  .regex(/[A-Z]/, "Inclua uma letra maiúscula.")
  .regex(/\d/, "Inclua um número.")
  .regex(/[^A-Za-z0-9]/, "Inclua um símbolo.")
  .refine((value) => !/(senha|password|123456|qwerty)/i.test(value), "Escolha uma senha menos previsível.");

export const initialAdminSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome.").max(120),
  email: z.string().trim().email("Informe um e-mail válido.").max(254).transform((value) => value.toLowerCase()),
  password: strongPasswordSchema,
  confirmPassword: z.string(),
  termsAccepted: z.literal("on", { errorMap: () => ({ message: "Aceite os termos de administração." }) }),
  privacyAccepted: z.literal("on", { errorMap: () => ({ message: "Aceite o aviso de privacidade." }) }),
}).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "As senhas não conferem." })
  .refine((data) => !data.password.toLowerCase().includes(data.email.split("@")[0].toLowerCase()), { path: ["password"], message: "A senha não deve conter seu e-mail." });

export function isInitialSetupAllowed(host: string | null) {
  if (process.env.INITIAL_SETUP_ENABLED === "true") return true;

  try {
    const hostname = new URL(`http://${host ?? ""}`).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}
