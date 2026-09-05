import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";

// Preserve old bookmarks and stored records while retiring this interface.
export default async function RetiredPage() {
  await requireStaff();
  redirect("/admin/agenda");
}
