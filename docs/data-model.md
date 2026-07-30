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

Work Package 5 supplies six original local SVG illustrations under
public/targets/, credited as Astrotools and licensed under CC BY 4.0. Every
target seed now records its safe /targets/ path, credit, and HTTPS licence URL
as an all-or-none set. Seed validation rejects remote paths, traversal,
unsupported file types, and incomplete attribution. Before any database write,
the seed command parser-validates every declared SVG against a static
element-and-attribute allowlist and rejects declarations, executable content,
unsafe resource references, and malformed XML. Adversarial repository tests lock
that policy. The separate target sourceUrl continues to identify the scientific
angular-size and orientation source; it is not overloaded as an artwork source.

`framingNote` is a nullable, catalogue-governed scientific qualification for a
target footprint. The Rosette Nebula's 2.1° × 1.916667° footprint is a planning
proxy derived from the cited photograph's 126 × 115 arcminute north-up,
east-left frame, not a calibrated boundary of the nebula. Other initial targets
do not require a framing note. Any interface that presents a qualified footprint
must expose the note alongside that framing result.

`defaultRotationDeg` is the target's astronomical position angle, measured from
celestial north through east and stored from 0° inclusive to 180° exclusive. The
north-up, east-left simulator converts that value to its SVG coordinate system
before assessing fit. Equal-axis targets are rotation-invariant.

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
