import "server-only";

import { engagementRepository } from "./repositories/engagement-repository";
import { createEngagementService } from "./services/engagement-service";

export const engagementService = createEngagementService(engagementRepository);
