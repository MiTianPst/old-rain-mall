import "server-only";

import { historyRepository } from "./repositories/history-repository";
import { createHistoryService } from "./services/history-service";

export const historyService = createHistoryService(historyRepository);
