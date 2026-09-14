import { homepageRepository } from "./repositories/homepage-repository";
import { createHomepageService } from "./services/homepage-service";

export const homepageService = createHomepageService(homepageRepository);
