# MySQL operator notes

Work Package 3 targets MySQL 8.4 LTS on the Ubuntu 24.04 application host, bound
to `127.0.0.1`. The files in this directory document the least-privilege model;
they are not an automated production deployment and must not be applied without
operational review. Development, CI, migration, and production catalogue tables
use `utf8mb4_unicode_ci` so case and accent handling remain consistent.

## Identity separation

- `astrotools_app` is the long-running, non-root service identity. Release 1
  catalogue routes are read-only, so its post-migration template grants `SELECT`
  only on manufacturers, telescopes, cameras, optical modifiers, and targets.
- `astrotools_migrate` is a separate controlled-release identity. It is not
  loaded by systemd and is available only while applying reviewed migrations and
  seed data.
- MySQL root remains an operator-only identity and is never used by the
  application, CI integration tests, or ordinary releases.

[`least-privilege.sql.template`](least-privilege.sql.template) is deliberately
non-executable until an operator substitutes strong, separately generated
passwords. Generate one hexadecimal value per distinct placeholder with
`openssl rand -hex 32`, replace every repeated occurrence of that placeholder
consistently, and never reuse a value across identities. Hexadecimal values can
be copied into both the SQL and MySQL URL without extra escaping. Review the
template's grants against the actual migration before applying it. Store
resulting URLs outside the repository. The runtime service receives its URL as
`DATABASE_URL`; the release process supplies the migration URL under the
`MIGRATION_DATABASE_URL` variable only for `npm run db:migrate:deploy` and the
reviewed seed step.

Provisioning is deliberately two-phase. First apply the rendered
`least-privilege.sql.template` to create the database and identities. Apply the
reviewed migration and seed with the migration identity. Only after the tables
exist, apply
[`runtime-read-grants.sql.template`](runtime-read-grants.sql.template) as the
administrator. That final template revokes broad or stale permissions before
granting only the five tables used by public API routes; it does not grant
access to `catalogue_change_log`, `_prisma_migrations`, or future tables.

Binding, TLS, firewall, backup, restore, and password-rotation procedures remain
Work Package 9. The accepted same-host topology requires
`bind-address = 127.0.0.1`; do not expose port 3306 publicly.

## Disposable local databases

[`development.sql.template`](development.sql.template) provisions separate
`astrotools_dev`, `astrotools_shadow`, and `astrotools_test` databases. The
development identity is scoped to the first two so Prisma Migrate can safely
soft-reset its dedicated shadow database without receiving global database
creation privileges. The test database has distinct migration and SELECT-only
runtime identities, mirroring CI. It is for a developer-owned local MySQL
instance only. Replace each distinct password placeholder with its own generated
value before an administrator applies it, using that same value for every
occurrence of the given name; never use those identities, passwords, or broad
development grants in production.

The application `.env` points to `astrotools_dev` and its `SHADOW_DATABASE_URL`
points to `astrotools_shadow`. Production migration deploys do not use a shadow
database. Keep both test URLs in a permission-restricted, gitignored
`.env.integration`; the test runner requires them to name the same database and
refuses a database without a distinct `test` segment. After initially migrating
the test database, apply
[`development-read-grants.sql.template`](development-read-grants.sql.template)
as the local administrator before running the integration suite.
