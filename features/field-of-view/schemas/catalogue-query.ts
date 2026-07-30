import { z } from "zod";

import { MAX_CATALOGUE_SLUG_LENGTH } from "@/lib/catalogue-constants";

export const MAX_CATALOGUE_PAGE = 10_000;
export const MAX_CATALOGUE_PAGE_SIZE = 50;
export const MAX_CATALOGUE_SEARCH_LENGTH = 100;

const boundedIntegerString = (maximum: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(maximum));

const optionalSearch = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0
      ? undefined
      : typeof value === "string"
        ? value.trim()
        : value,
  z.string().max(MAX_CATALOGUE_SEARCH_LENGTH).optional(),
);

export const catalogueSlugSchema = z
  .string()
  .min(1)
  .max(MAX_CATALOGUE_SLUG_LENGTH)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const listQueryShape = {
  page: boundedIntegerString(MAX_CATALOGUE_PAGE).default(1),
  pageSize: boundedIntegerString(MAX_CATALOGUE_PAGE_SIZE).default(20),
  q: optionalSearch,
};

export const catalogueListQuerySchema = z.object(listQueryShape).strict();

export const equipmentListQuerySchema = z
  .object({
    ...listQueryShape,
    manufacturer: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim().length === 0
          ? undefined
          : value,
      catalogueSlugSchema.optional(),
    ),
  })
  .strict();

export type CatalogueListQuery = z.infer<typeof catalogueListQuerySchema>;
export type EquipmentListQuery = z.infer<typeof equipmentListQuerySchema>;
