import { createPrismaCatalogueRepository } from "@/lib/db/catalogue-repository";
import { getPrismaClient } from "@/lib/db/client";

import { createCatalogueService } from "./catalogue-service";
import type { CatalogueService } from "./catalogue-types";

export function getCatalogueService(): CatalogueService {
  return createCatalogueService(
    createPrismaCatalogueRepository(getPrismaClient()),
  );
}
