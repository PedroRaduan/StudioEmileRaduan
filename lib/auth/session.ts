import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { hmac, sha256 } from "@/lib/security/hash";
import { can, type Permission, type StaffRole } from "@/lib/auth/permissions";

const SESSION_COOKIE = "erbf_session";
const SESSION_DAYS = 7;

export type CurrentUser = { id: string; name: string; email: string; role: StaffRole; isTemporary: boolean };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await getPrisma().session.findUnique({
    where: { tokenHash: hmac(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    if (session) await getPrisma().session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role, isTemporary: session.user.isTemporary };
}

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireStaff();
  if (!can(user.role, permission)) redirect("/admin/acesso-negado");
  return user;
}

export async function requireOwner() {
  return requirePermission("SETTINGS_MANAGE");
}


export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const requestHeaders = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await getPrisma().session.create({
    data: {
      userId,
      tokenHash: hmac(token),
      expiresAt,
      ipHash: hashIp(requestHeaders.get("x-forwarded-for")),
      userAgent: requestHeaders.get("user-agent")?.slice(0, 500),
    },
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token && process.env.DATABASE_URL && process.env.SESSION_SECRET) {
    await getPrisma().session.deleteMany({ where: { tokenHash: hmac(token) } });
  }
  (await cookies()).delete(SESSION_COOKIE);
}

export function hashIp(ip: string | null) {
  if (!ip) return null;
  return process.env.SESSION_SECRET ? hmac(ip.split(",")[0].trim()) : sha256(ip.split(",")[0].trim());
}

export async function assertSameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!origin || !host) return;
  const originHost = new URL(origin).host;
  if (originHost !== host) throw new Error("Solicitação inválida.");
}
