"use server";

import { redirect } from "next/navigation";
import { assertSameOrigin, destroyCurrentSession } from "@/lib/auth/session";

export async function logoutAction() {
  await assertSameOrigin();
  await destroyCurrentSession();
  redirect("/admin/login");
}
