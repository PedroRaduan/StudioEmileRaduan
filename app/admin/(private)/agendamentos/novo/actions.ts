"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAppointment, SchedulingError } from "@/lib/agenda/create-appointment";
import { assertSameOrigin, requirePermission } from "@/lib/auth/session";

export type AppointmentFormState = { error?: string };

const schema = z.object({
  clientId: z.string().cuid(), serviceId: z.string().cuid(), resourceId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(2000).optional(), requestKey: z.string().uuid().optional(),
});

export async function createAppointmentAction(_: AppointmentFormState, formData: FormData): Promise<AppointmentFormState> {
  await assertSameOrigin();
  const owner = await requirePermission("APPOINTMENTS_MANAGE");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revise os dados obrigatórios do agendamento." };
  let appointmentId: string;
  try {
    const appointment = await createAppointment({ ...parsed.data, ownerId: owner.id });
    appointmentId = appointment.id;
  } catch (error) {
    return { error: error instanceof SchedulingError ? error.message : "Não foi possível salvar o agendamento. Tente novamente." };
  }
  revalidatePath("/admin"); revalidatePath("/admin/agenda"); revalidatePath("/admin/clientes");
  redirect(`/admin/agenda?date=${parsed.data.date}&saved=${appointmentId}`);
}
