import "server-only";

import { shipmentRepository } from "@/server/repositories/shipment-repository";
import { createShipmentService } from "@/server/services/shipment-service";

export const shipmentService = createShipmentService(shipmentRepository);

