import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { enforcePostgresCertificateVerification } from "@/lib/db/postgres-url";
import { requireTenantContext } from "@/lib/tenancy/context";

type TenantQueryArgs = Record<string, unknown> & {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const tenantModels = new Set([
  "StudioSettings", "ServiceCategory", "Service", "Client", "ClientHealthProfile", "ClientNote",
  "CalendarResource", "Appointment", "ClientAccount", "ClientPasswordResetToken", "ClientSession",
  "ClientRecoveryRequest", "BookingHold", "AppointmentActionToken", "AppointmentEvent", "AvailabilityRule",
  "AvailabilityException", "ScheduleBlock", "Holiday", "Payment", "PaymentEvent", "MessageTemplate",
  "MessageLog", "Document", "Consent", "PrivacyRequest", "AuditLog", "WaitlistEntry", "WaitlistOffer",
  "Expense", "DailyCashClose", "ServicePackage", "PackageRedemption", "CommissionRule", "CommissionEntry",
]);

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não foi configurada.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: enforcePostgresCertificateVerification(connectionString) }) });
}

function scopeWhere(where: Record<string, unknown> | undefined, organizationId: string) {
  return where ? { AND: [where, { organizationId }] } : { organizationId };
}

function scopeData(data: TenantQueryArgs["data"], organizationId: string) {
  if (Array.isArray(data)) return data.map((item) => ({ ...item, organizationId }));
  return data ? { ...data, organizationId } : data;
}

function scopeNestedCreates(value: unknown, organizationId: string): unknown {
  if (Array.isArray(value)) return value.map((item) => scopeNestedCreates(item, organizationId));
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(record)) {
    if (key === "create") {
      if (Array.isArray(nested)) {
        result[key] = nested.map((item) => item && typeof item === "object" ? scopeNestedCreates({ ...(item as Record<string, unknown>), organizationId }, organizationId) : item);
      } else if (nested && typeof nested === "object") {
        result[key] = scopeNestedCreates({ ...(nested as Record<string, unknown>), organizationId }, organizationId);
      } else {
        result[key] = nested;
      }
      continue;
    }
    if (key === "createMany" && nested && typeof nested === "object") {
      const createMany = nested as Record<string, unknown>;
      const nestedData = createMany.data;
      result[key] = {
        ...createMany,
        data: Array.isArray(nestedData)
          ? nestedData.map((item) => item && typeof item === "object" ? { ...(item as Record<string, unknown>), organizationId } : item)
          : nestedData && typeof nestedData === "object" ? { ...(nestedData as Record<string, unknown>), organizationId } : nestedData,
      };
      continue;
    }
    result[key] = scopeNestedCreates(nested, organizationId);
  }
  return result;
}

function scopeTenantQuery(args: unknown, operation: string, organizationId: string): unknown {
  const scoped = { ...(args as TenantQueryArgs) };
  if (operation !== "create" && operation !== "createMany") {
    scoped.where = scopeWhere(scoped.where, organizationId);
  }
  if (["create", "createMany", "update", "updateMany", "upsert"].includes(operation)) {
    scoped.data = scopeData(scoped.data, organizationId);
    scoped.data = scopeNestedCreates(scoped.data, organizationId) as TenantQueryArgs["data"];
  }
  if (operation === "upsert") {
    const create = (scoped as { create?: Record<string, unknown> }).create;
    const update = (scoped as { update?: Record<string, unknown> }).update;
    (scoped as { create?: Record<string, unknown> }).create = create ? scopeNestedCreates({ ...create, organizationId }, organizationId) as Record<string, unknown> : create;
    (scoped as { update?: Record<string, unknown> }).update = update ? { ...update, organizationId } : update;
  }
  return scoped;
}

function createTenantPrisma(client: PrismaClient) {
  return client.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!tenantModels.has(model)) return query(args);
          const { organizationId } = requireTenantContext();
          return query(scopeTenantQuery(args, operation, organizationId) as never);
        },
      },
    },
  });
}

type TenantPrisma = ReturnType<typeof createTenantPrisma>;
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; tenantPrisma?: TenantPrisma };

export function getPrisma() {
  const prisma = globalForPrisma.prisma ?? createPrismaClient();
  // O adapter PostgreSQL mantém um pool de conexões. Reutilizar a instância
  // também em produção evita abrir um pool novo a cada chamada do mesmo
  // processo/serverless isolate.
  globalForPrisma.prisma = prisma;
  globalForPrisma.tenantPrisma ??= createTenantPrisma(prisma);
  return globalForPrisma.tenantPrisma;
}

// Uso estritamente limitado a autenticação, onboarding e links públicos com
// token. Operações de domínio devem sempre passar por getPrisma().
export function getSystemPrisma() {
  const prisma = globalForPrisma.prisma ?? createPrismaClient();
  globalForPrisma.prisma = prisma;
  return prisma;
}
