import { afterAll, describe, expect, it } from "vitest";

import { GET as livenessGet } from "@/app/api/health/live/route";
import { GET as readinessGet } from "@/app/api/health/ready/route";
import { GET as cameraDetailGet } from "@/app/api/v1/cameras/[slug]/route";
import { GET as camerasGet } from "@/app/api/v1/cameras/route";
import { GET as modifiersGet } from "@/app/api/v1/optical-modifiers/route";
import { GET as telescopeDetailGet } from "@/app/api/v1/telescopes/[slug]/route";
import { GET as telescopesGet } from "@/app/api/v1/telescopes/route";
import { GET as targetsGet } from "@/app/api/v1/targets/route";
import {
  createPrismaClient,
  disconnectPrismaClient,
  getPrismaClient,
} from "@/lib/db/client";
import { seedCatalogue } from "@/prisma/seed";

const runtimeDatabaseUrl = process.env.DATABASE_URL;
const migrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL;

if (!runtimeDatabaseUrl || !migrationDatabaseUrl) {
  throw new Error(
    "DATABASE_URL and MIGRATION_DATABASE_URL are required for integration tests.",
  );
}

const prisma = getPrismaClient();
const migrationPrisma = createPrismaClient({
  DATABASE_URL: migrationDatabaseUrl,
});

interface ApiListEnvelope<T> {
  apiVersion: string;
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ApiItemEnvelope<T> {
  apiVersion: string;
  data: T;
}

interface ApiErrorEnvelope {
  apiVersion: string;
  error: { code: string; message: string };
}

afterAll(async () => {
  await Promise.all([disconnectPrismaClient(), migrationPrisma.$disconnect()]);
});

describe("MySQL catalogue integration", () => {
  it("runs on MySQL 8.4 with a non-root test identity", async () => {
    const expectedUser = decodeURIComponent(
      new URL(runtimeDatabaseUrl).username,
    );
    const [server] = await prisma.$queryRaw<
      Array<{ version: string; currentUser: string; databaseName: string }>
    >`SELECT VERSION() AS version, CURRENT_USER() AS currentUser, DATABASE() AS databaseName`;

    expect(server).toBeDefined();
    expect(server!.version).toMatch(/^8\.4\./);
    expect(server!.currentUser).toMatch(
      new RegExp(`^${expectedUser.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}@`),
    );
    expect(server!.currentUser).not.toMatch(/^root@/);
    expect(server!.databaseName).toMatch(/(^|[_-])test($|[_-])/i);
  });

  it("bounds read statements without expiring a healthy idle pooled connection", async () => {
    await prisma.$transaction(async (transaction) => {
      const [before] = await transaction.$queryRaw<
        Array<{ connectionId: bigint; statementLimitMs: bigint }>
      >`
          SELECT
            CONNECTION_ID() AS connectionId,
            @@SESSION.max_execution_time AS statementLimitMs
        `;

      await new Promise((resolve) => setTimeout(resolve, 2_100));

      const [after] = await transaction.$queryRaw<
        Array<{ connectionId: bigint; statementLimitMs: bigint }>
      >`
          SELECT
            CONNECTION_ID() AS connectionId,
            @@SESSION.max_execution_time AS statementLimitMs
        `;

      expect(after!.connectionId).toBe(before!.connectionId);
      expect(Number(after!.statementLimitMs)).toBe(2_000);
    });

    const startedAt = performance.now();
    const [sleepResult] = await prisma.$queryRaw<
      Array<{ interrupted: bigint }>
    >`
        SELECT SLEEP(3) AS interrupted
      `;

    expect(sleepResult!.interrupted).toBe(1n);
    expect(performance.now() - startedAt).toBeLessThan(2_800);
  }, 10_000);

  it("applies the reviewed migration with InnoDB and DECIMAL measurements", async () => {
    const expectedTables = [
      "astronomical_targets",
      "cameras",
      "catalogue_change_log",
      "manufacturers",
      "optical_modifiers",
      "telescopes",
    ];
    const tableRows = await migrationPrisma.$queryRaw<
      Array<{ tableName: string; engine: string; tableCollation: string }>
    >`
      SELECT
        TABLE_NAME AS tableName,
        ENGINE AS engine,
        TABLE_COLLATION AS tableCollation
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (
          'astronomical_targets',
          'cameras',
          'catalogue_change_log',
          'manufacturers',
          'optical_modifiers',
          'telescopes'
        )
      ORDER BY TABLE_NAME
    `;

    expect(tableRows.map(({ tableName }) => tableName)).toEqual(expectedTables);
    expect(tableRows.every(({ engine }) => engine === "InnoDB")).toBe(true);
    expect(
      tableRows.every(
        ({ tableCollation }) => tableCollation === "utf8mb4_unicode_ci",
      ),
    ).toBe(true);

    const decimalRows = await migrationPrisma.$queryRaw<
      Array<{ tableName: string; columnName: string; dataType: string }>
    >`
      SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, DATA_TYPE AS dataType
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND DATA_TYPE = 'decimal'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `;

    expect(
      decimalRows.map(
        ({ tableName, columnName }) => `${tableName}.${columnName}`,
      ),
    ).toEqual([
      "astronomical_targets.angular_height_deg",
      "astronomical_targets.angular_width_deg",
      "astronomical_targets.default_rotation_deg",
      "cameras.pixel_size_um",
      "cameras.sensor_height_mm",
      "cameras.sensor_width_mm",
      "optical_modifiers.multiplier",
      "telescopes.aperture_mm",
      "telescopes.native_focal_length_mm",
    ]);
    expect(decimalRows.every(({ dataType }) => dataType === "decimal")).toBe(
      true,
    );

    const [framingNoteColumn] = await migrationPrisma.$queryRaw<
      Array<{
        dataType: string;
        isNullable: string;
        maximumLength: bigint;
      }>
    >`
      SELECT
        DATA_TYPE AS dataType,
        IS_NULLABLE AS isNullable,
        CHARACTER_MAXIMUM_LENGTH AS maximumLength
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'astronomical_targets'
        AND COLUMN_NAME = 'framing_note'
    `;

    expect(framingNoteColumn).toBeDefined();
    expect(framingNoteColumn).toMatchObject({
      dataType: "varchar",
      isNullable: "YES",
    });
    expect(Number(framingNoteColumn!.maximumLength)).toBe(1024);
  });

  it("limits the runtime identity to API-readable catalogue tables", async () => {
    await expect(
      prisma.$executeRaw`UPDATE telescopes SET active = active WHERE id = '00000000-0000-0000-0000-000000000000'`,
    ).rejects.toThrow();
    await expect(prisma.catalogueChangeLog.count()).rejects.toThrow();
    await expect(
      prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations LIMIT 1`,
    ).rejects.toThrow();
  });

  it("contains the complete sourced seed and remains idempotent", async () => {
    const countsBefore = {
      manufacturers: await prisma.manufacturer.count(),
      telescopes: await prisma.telescope.count(),
      cameras: await prisma.camera.count(),
      modifiers: await prisma.opticalModifier.count(),
      targets: await prisma.astronomicalTarget.count(),
      changes: await migrationPrisma.catalogueChangeLog.count(),
    };
    const telescopeIdsBefore = await prisma.telescope.findMany({
      orderBy: { slug: "asc" },
      select: { id: true, slug: true },
    });
    const rosette = await prisma.astronomicalTarget.findUniqueOrThrow({
      where: { slug: "ngc-2237-rosette-nebula" },
      select: { id: true, framingNote: true },
    });

    expect(countsBefore).toMatchObject({
      manufacturers: 5,
      telescopes: 12,
      cameras: 3,
      modifiers: 4,
      targets: 6,
    });
    expect(countsBefore.changes).toBeGreaterThanOrEqual(17);
    expect(rosette.framingNote).toBe(
      "Planning proxy based on the cited 126 × 115 arcminute north-up, east-left image frame; not a calibrated boundary of the nebula.",
    );

    const rosetteChange = await migrationPrisma.catalogueChangeLog.findFirst({
      where: {
        entityType: "astronomical_target",
        entityId: rosette.id,
      },
      orderBy: { createdAt: "desc" },
      select: { afterJson: true },
    });
    expect(rosetteChange?.afterJson).toMatchObject({
      framingNote:
        "Planning proxy based on the cited 126 × 115 arcminute north-up, east-left image frame; not a calibrated boundary of the nebula.",
    });

    await seedCatalogue(migrationPrisma);

    await expect(
      Promise.all([
        prisma.manufacturer.count(),
        prisma.telescope.count(),
        prisma.camera.count(),
        prisma.opticalModifier.count(),
        prisma.astronomicalTarget.count(),
        migrationPrisma.catalogueChangeLog.count(),
      ]),
    ).resolves.toEqual([5, 12, 3, 4, 6, countsBefore.changes]);
    await expect(
      prisma.telescope.findMany({
        orderBy: { slug: "asc" },
        select: { id: true, slug: true },
      }),
    ).resolves.toEqual(telescopeIdsBefore);

    const equipmentSources = await Promise.all([
      prisma.telescope.findMany({
        select: { sourceUrl: true, verifiedAt: true },
      }),
      prisma.camera.findMany({ select: { sourceUrl: true, verifiedAt: true } }),
      prisma.opticalModifier.findMany({
        select: { sourceUrl: true, verifiedAt: true },
      }),
      prisma.astronomicalTarget.findMany({
        select: { sourceUrl: true, verifiedAt: true },
      }),
    ]);

    for (const record of equipmentSources.flat()) {
      expect(record.sourceUrl).toMatch(/^https:\/\//);
      expect(record.verifiedAt.toISOString().slice(0, 10)).toBe("2026-07-30");
    }
  });

  it("serves bounded, cached and serializable catalogue lists", async () => {
    const telescopeResponse = await telescopesGet(
      new Request(
        "http://127.0.0.1:3100/api/v1/telescopes?page=1&pageSize=1&q=cat&manufacturer=william-optics",
      ),
    );
    const telescopeBody = (await telescopeResponse.json()) as ApiListEnvelope<{
      slug: string;
      apertureMm: string;
      nativeFocalLengthMm: string;
      verifiedAt: string;
      manufacturer: { slug: string };
    }>;

    expect(telescopeResponse.status).toBe(200);
    expect(telescopeResponse.headers.get("Cache-Control")).toBe(
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    expect(telescopeBody).toMatchObject({
      apiVersion: "v1",
      meta: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
      data: [
        {
          slug: "cat-51-wifd",
          apertureMm: "51",
          nativeFocalLengthMm: "250",
          manufacturer: { slug: "william-optics" },
        },
      ],
    });
    expect(telescopeBody.data[0]!.verifiedAt).toMatch(
      /^2026-07-30T00:00:00\.000Z$/,
    );

    const cameraResponse = await camerasGet(
      new Request(
        "http://127.0.0.1:3100/api/v1/cameras?manufacturer=zwo&pageSize=1",
      ),
    );
    const cameraBody = (await cameraResponse.json()) as ApiListEnvelope<{
      slug: string;
      sensorWidthMm: string;
    }>;
    expect(cameraBody.meta).toEqual({
      page: 1,
      pageSize: 1,
      total: 3,
      totalPages: 3,
    });
    expect(cameraBody.data[0]).toMatchObject({
      slug: "asi1600mm-pro",
      sensorWidthMm: "17.6",
    });

    const [modifierResponse, targetResponse] = await Promise.all([
      modifiersGet(
        new Request("http://127.0.0.1:3100/api/v1/optical-modifiers"),
      ),
      targetsGet(new Request("http://127.0.0.1:3100/api/v1/targets?q=Moon")),
    ]);
    const modifierBody = (await modifierResponse.json()) as ApiListEnvelope<{
      multiplier: string;
    }>;
    const targetBody = (await targetResponse.json()) as ApiListEnvelope<{
      slug: string;
      angularWidthDeg: string;
    }>;

    expect(modifierBody.meta.total).toBe(4);
    expect(modifierBody.data.map(({ multiplier }) => multiplier)).toEqual([
      "0.2",
      "0.7",
      "0.7",
      "0.85",
    ]);
    expect(targetBody.data).toEqual([
      expect.objectContaining({ slug: "moon", angularWidthDeg: "0.5" }),
    ]);
  });

  it("returns safe validation and missing-item errors", async () => {
    const invalidResponse = await telescopesGet(
      new Request(
        `http://127.0.0.1:3100/api/v1/telescopes?q=${"x".repeat(101)}`,
      ),
    );
    const invalidBody = (await invalidResponse.json()) as ApiErrorEnvelope;

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.headers.get("Cache-Control")).toBe("no-store");
    expect(invalidBody).toEqual({
      apiVersion: "v1",
      error: {
        code: "INVALID_REQUEST",
        message: "The request parameters are invalid.",
      },
    });

    const missingResponse = await cameraDetailGet(
      new Request("http://127.0.0.1:3100/api/v1/cameras/not-catalogued"),
      { params: Promise.resolve({ slug: "not-catalogued" }) },
    );
    const missingBody = (await missingResponse.json()) as ApiErrorEnvelope;

    expect(missingResponse.status).toBe(404);
    expect(missingBody.error.code).toBe("CATALOGUE_ITEM_NOT_FOUND");
    expect(JSON.stringify(missingBody)).not.toContain("SELECT");

    const detailQueryResponse = await telescopeDetailGet(
      new Request(
        "http://127.0.0.1:3100/api/v1/telescopes/cat-51-wifd?unexpected=value",
      ),
      { params: Promise.resolve({ slug: "cat-51-wifd" }) },
    );
    expect(detailQueryResponse.status).toBe(400);
  });

  it("treats LIKE metacharacters as literal catalogue search text", async () => {
    for (const query of ["%25", "_", "%5C"]) {
      const telescopeResponse = await telescopesGet(
        new Request(`http://127.0.0.1:3100/api/v1/telescopes?q=${query}`),
      );
      const telescopeBody =
        (await telescopeResponse.json()) as ApiListEnvelope<unknown>;
      const targetResponse = await targetsGet(
        new Request(`http://127.0.0.1:3100/api/v1/targets?q=${query}`),
      );
      const targetBody =
        (await targetResponse.json()) as ApiListEnvelope<unknown>;

      expect(telescopeBody.meta.total).toBe(0);
      expect(targetBody.meta.total).toBe(0);
    }
  });

  it("hides inactive equipment from lists but preserves detail links", async () => {
    const slug = "cat-51-wifd";

    await migrationPrisma.telescope.update({
      where: { slug },
      data: { active: false },
    });

    try {
      const listResponse = await telescopesGet(
        new Request(`http://127.0.0.1:3100/api/v1/telescopes?q=cat`),
      );
      const listBody = (await listResponse.json()) as ApiListEnvelope<{
        slug: string;
      }>;
      expect(listBody.data).toEqual([]);
      expect(listBody.meta.total).toBe(0);

      const detailResponse = await telescopeDetailGet(
        new Request(`http://127.0.0.1:3100/api/v1/telescopes/${slug}`),
        { params: Promise.resolve({ slug }) },
      );
      const detailBody = (await detailResponse.json()) as ApiItemEnvelope<{
        slug: string;
        active: boolean;
      }>;

      expect(detailResponse.status).toBe(200);
      expect(detailBody.data).toMatchObject({ slug, active: false });
    } finally {
      await migrationPrisma.telescope.update({
        where: { slug },
        data: { active: true },
      });
    }
  });

  it("keeps liveness database-independent and readiness database-backed", async () => {
    const livenessResponse = livenessGet(
      new Request("http://127.0.0.1:3100/api/health/live"),
    );
    const readinessResponse = await readinessGet(
      new Request("http://127.0.0.1:3100/api/health/ready"),
    );

    expect(livenessResponse.status).toBe(200);
    expect(livenessResponse.headers.get("Cache-Control")).toBe("no-store");
    await expect(livenessResponse.json()).resolves.toEqual({
      apiVersion: "v1",
      data: { status: "ok" },
    });

    expect(readinessResponse.status).toBe(200);
    expect(readinessResponse.headers.get("Cache-Control")).toBe("no-store");
    await expect(readinessResponse.json()).resolves.toEqual({
      apiVersion: "v1",
      data: { status: "ready" },
    });

    expect(
      livenessGet(
        new Request("http://127.0.0.1:3100/api/health/live?probe=full"),
      ).status,
    ).toBe(400);
  });
});
