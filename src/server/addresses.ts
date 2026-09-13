import "server-only";

import { addressRepository } from "./repositories/address-repository";
import { createAddressService } from "./services/address-service";

export const addressService = createAddressService(addressRepository);
