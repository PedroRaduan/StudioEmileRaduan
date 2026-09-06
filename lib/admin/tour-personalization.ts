import { z } from "zod";
import { AGENDA_COLORS } from "../agenda/colors";

export const tourPersonalizationSchema = z.object({
  studioName: z.string().trim().min(2).max(100),
  primaryColor: z.string().refine((value) => AGENDA_COLORS.some((color) => color.value === value)),
  calendarSlotInterval: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]),
}).strict();
export type TourPersonalization = z.infer<typeof tourPersonalizationSchema>;

export type DemoStatus = "free" | "scheduled" | "confirmed" | "completed" | "cancelled";
export function demoNextStatus(status: DemoStatus, action: "book" | "confirm" | "complete" | "cancel" | "reset"): DemoStatus {
  if (action === "reset") return "free";
  if (action === "book" && (status === "free" || status === "cancelled")) return "scheduled";
  if (action === "confirm" && status === "scheduled") return "confirmed";
  if (action === "complete" && status === "confirmed") return "completed";
  if (action === "cancel" && (status === "scheduled" || status === "confirmed")) return "cancelled";
  return status;
}
