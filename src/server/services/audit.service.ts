import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export async function recordAudit(input: {
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      userId: input.userId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
