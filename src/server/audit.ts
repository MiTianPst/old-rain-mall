import "server-only";

import { auditRepository } from "@/server/repositories/audit-repository";
import { createAuditService } from "@/server/services/audit-service";

export const auditService = createAuditService(auditRepository);

