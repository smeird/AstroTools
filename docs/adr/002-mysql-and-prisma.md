# ADR-002: Use MySQL 8.4 LTS and Prisma ORM

- Status: Accepted
- Date: 29 July 2026
- Updated: 30 July 2026

## Context

Equipment and target catalogue data needs durable, queryable storage, migration
history, numeric integrity, and typed access from the TypeScript application.

## Decision

Use the MySQL 8.4 LTS series with InnoDB and current stable Prisma ORM using the
MySQL connector. Store catalogue measurements in appropriate DECIMAL columns.
Use Prisma Migrate for reviewed migrations and repository-controlled, idempotent
seed data with provenance on every record.

The confirmed initial topology places MySQL on the Ubuntu 24.04 application
host, bound to `127.0.0.1`. The application uses a least-privilege non-root
account. Production migration credentials are separate from runtime credentials
and are injected only into the controlled release step. Production invokes
`prisma migrate deploy`, never interactive development or destructive migration
commands.

Prisma 7 uses `prisma.config.ts`, the `prisma-client` generator, and the
official MariaDB/MySQL driver adapter.

## Consequences

- Schema changes are versioned and deployed independently of application
  rollback assumptions.
- Integration testing uses a pinned MySQL 8.4.10 service and disposable,
  non-root credentials.
- Backups must be encrypted and restoration-tested.
- Runtime manufacturer scraping and root database access are prohibited.

## References

- [MySQL 8.4 release model](https://dev.mysql.com/doc/refman/8.4/en/mysql-releases.html)
- [Prisma MySQL connector](https://www.prisma.io/docs/orm/overview/databases/mysql)
- [Prisma 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
