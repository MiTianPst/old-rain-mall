import "server-only";

import { cartRepository } from "./repositories/cart-repository";
import { createCartService } from "./services/cart-service";

export const cartService = createCartService(cartRepository);
