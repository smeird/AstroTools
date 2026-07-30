# Data model

- Status: Work Package 3 catalogue contract
- Last reviewed: 30 July 2026

MySQL 8.4 LTS and Prisma store the curated equipment and target catalogue. The
schema follows the core tables in the implementation baseline: manufacturers,
telescopes, cameras, optical modifiers, astronomical targets, and the catalogue
change log. Account, saved-rig, short-link, audit, and feedback tables remain
deferred until their capabilities are authorised.

## Numeric and identifier policy

- Measurements use DECIMAL columns, never FLOAT.
- Catalogue databases and tables use `utf8mb4_unicode_ci` consistently in local,
  CI, and production templates so slug uniqueness and search behaviour do not
  change between environments.
- Application calculations convert database values at the service boundary and
  retain full JavaScript `Number` precision until presentation formatting.
- Externally exposed records use stable UUIDs or ULIDs and unique slugs.
- Canonical units are millimetres, micrometres, degrees, arcseconds, and
  dimensionless multipliers.
- Sensor dimensions derived from resolution and pixel pitch are validated
  against stored dimensions with the initial 0.1 mm discrepancy tolerance.

## Catalogue governance

Catalogue administration is repository-driven; Release 1 has no administration
UI. Reviewed structured seed data is the source of truth, and the seed must be
idempotent. Every equipment and target record carries a source URL and
verification date. Inactive records remain queryable by stable identifier so
existing shared configurations can continue to resolve.

Target imagery must be either:

- public-domain or Creative Commons material whose exact licence, source,
  credit, and verification date are recorded in the repository; or
- an internally created representation labelled as illustrative.

Runtime scraping is prohibited. A catalogue change updates its repository seed,
provenance evidence, validation tests, and change-log representation in the same
review.

## Database identities

The long-running service uses a non-root runtime identity with only the access
required by read-only catalogue routes: table-level SELECT on manufacturers,
telescopes, cameras, optical modifiers, and astronomical targets. It cannot read
the catalogue change log, Prisma migration history, or future tables by default.
A distinct migration identity is made available as `MIGRATION_DATABASE_URL` only
to the controlled production migration and seed step. CI uses an isolated
`astrotools_test` database with a disposable migration owner and a separate
table-scoped `astrotools_app` runtime identity; those literals are not
production secrets.

See [ADR-002](adr/002-mysql-and-prisma.md),
[ADR-004](adr/004-production-profile-and-catalogue-governance.md), and the
[MySQL operator notes](../ops/mysql/README.md).
