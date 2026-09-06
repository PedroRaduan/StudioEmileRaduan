import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";

export default async function RetiredSettingsPage() {
  await requirePermission("SETTINGS_MANAGE");
  // Preserve historical documents and messages; retire only the editor UI.
  redirect("/admin/configuracoes");
}
