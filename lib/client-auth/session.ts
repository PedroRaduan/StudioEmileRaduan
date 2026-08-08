import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { hashIp } from "@/lib/auth/session";
import { sha256 } from "@/lib/security/hash";

const CLIENT_SESSION_COOKIE = "erbf_client_session";
const CLIENT_SESSION_DAYS = 30;

export type CurrentClient = {
  accountId: string;
  clientId: string;
  email: string;
  fullName: string;
  preferredName: string | null;
};

export async function getCurrentClient(): Promise<CurrentClient | null> {
  if (!process.env.DATABASE_URL) return null;
  const token = (await cookies()).get(CLIENT_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await getPrisma().clientSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { account: { include: { client: true } } },
  });

  if (!session || session.expiresAt <= new Date() || !session.account.isActive || session.account.client.deletedAt) {
    if (session) await getPrisma().clientSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return {
    accountId: session.account.id,
    clientId: session.account.clientId,
    email: session.account.email,
    fullName: session.account.client.fullName,
    preferredName: session.account.client.preferredName,
  };
}

export async function requireClient() {
  const client = await getCurrentClient();
  if (!client) redirect("/conta/entrar?returnTo=/conta");
  return client;
}

export async function createClientSession(accountId: string) {
  const token = randomBytes(32).toString("base64url");
  const requestHeaders = await headers();
  const expiresAt = new Date(Date.now() + CLIENT_SESSION_DAYS * 24 * 60 * 60 * 1000);

  await getPrisma().clientSession.create({
    data: {
      accountId,
      tokenHash: sha256(token),
      expiresAt,
      ipHash: hashIp(requestHeaders.get("x-forwarded-for")),
      userAgent: requestHeaders.get("user-agent")?.slice(0, 500),
    },
  });

  (await cookies()).set(CLIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyClientSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (token && process.env.DATABASE_URL) {
    await getPrisma().clientSession.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  cookieStore.delete(CLIENT_SESSION_COOKIE);
}

export function safeReturnTo(value: unknown, fallback = "/conta") {
  const target = typeof value === "string" ? value : "";
  return target.startsWith("/") && !target.startsWith("//") && !target.includes("\\") ? target : fallback;
}
