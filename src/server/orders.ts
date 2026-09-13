import "server-only";

import { orderRepository } from "@/server/repositories/order-repository";
import { createOrderService } from "@/server/services/order-service";

export const orderService = createOrderService(orderRepository);
