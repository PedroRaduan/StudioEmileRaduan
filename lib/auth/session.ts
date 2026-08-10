import "server-only";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSystemPrisma } from "@/lib/db/prisma";
import { hmac, sha256 } from "@/lib/security/hash";
import { can, type Permission, type StaffRole } from "@/lib/auth/permissions";
import { originMatchesHost } from "@/lib/security/origin";

const SESSION_COOKIE = "erbf_session";
const SESSION_DAYS = 7;

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isTemporary: boolean;
  organizationId: string;
  membershipId: string;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const prisma = getSystemPrisma();
  const session = await prisma.session.findUnique({
    where: { tokenHash: hmac(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    return null;
  }
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId: session.userId,
      isActive: true,
      organization: { isActive: true },
      ...(session.organizationId ? { organizationId: session.organizationId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: membership.role,
    isTemporary: session.user.isTemporary,
    organizationId: membership.organizationId,
    membershipId: membership.id,
  };
});

export type AuthenticatedAccountUser = { id: string; name: string; email: string; isTemporary: boolean; sessionId: string };

export async function getAuthenticatedAccountUser(): Promise<AuthenticatedAccountUser | null> {
  if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await getSystemPrisma().session.findUnique({ where: { tokenHash: hmac(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive) return null;
  return { id: session.userId, name: session.user.name, email: session.user.email, isTemporary: session.user.isTemporary, sessionId: session.id };
}

export async function requireAuthenticatedAccountUser() {
  const user = await getAuthenticatedAccountUser();
  if (!user) redirect("/login");
  return user;
}

export async function setCurrentSessionOrganization(sessionId: string, organizationId: string) {
  await getSystemPrisma().session.update({ where: { id: sessionId }, data: { organizationId } });
}

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) {
    const hadSession = Boolean((await cookies()).get(SESSION_COOKIE)?.value);
    redirect(hadSession ? "/admin/login?reason=session-expired" : "/admin/login");
  }
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


export async function createSession(userId: string, organizationId?: string) {
  const token = randomBytes(32).toString("base64url");
  const requestHeaders = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await getSystemPrisma().session.create({
    data: {
      userId,
      organizationId,
      tokenHash: hmac(token),
      expiresAt,
      ipHash: hashIp(requestHeaders.get("x-forwarded-for")),
      userAgent: requestHeaders.get("user-agent")?.slice(0, 500),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  cookieStore.set(SESSION_COOKIE, token, {
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
    await getSystemPrisma().session.deleteMany({ where: { tokenHash: hmac(token) } });
  }
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: new Date(0) });
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: new Date(0) });
}

export function hashIp(ip: string | null) {
  if (!ip) return null;
  return process.env.SESSION_SECRET ? hmac(ip.split(",")[0].trim()) : sha256(ip.split(",")[0].trim());
}

export async function assertSameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? requestHeaders.get("host")?.trim();
  if (!origin || !host || !originMatchesHost(origin, host)) throw new Error("Solicitação inválida.");
}
