# ADR-002: Use MySQL 8.4 LTS and Prisma ORM

- Status: Accepted
- Date: 29 July 2026

## Context

Equipment and target catalogue data needs durable, queryable storage, migration
history, numeric integrity, and typed access from the TypeScript application.

## Decision

Use MySQL 8.4 LTS with InnoDB and current stable Prisma ORM using the MySQL
connector. Store catalogue measurements in appropriate DECIMAL columns. Use
Prisma Migrate for reviewed migrations and repository-controlled, idempotent
seed data with provenance on every record.

MySQL listens only on localhost or a private interface. The application uses a
least-privilege non-root account. Migration credentials are separate where
practicable. Production invokes `prisma migrate deploy`, never interactive
development or destructive migration commands.

Prisma 7 uses `prisma.config.ts`, the `prisma-client` generator, and—when
database access is introduced in Work Package 3—the official MariaDB/MySQL
driver adapter. No catalogue model is part of Work Package 0.

## Consequences

- Schema changes are versioned and deployed independently of application
  rollback assumptions.
- Integration testing requires a real MySQL 8.4 service from Work Package 3.
- Backups must be encrypted and restoration-tested.
- Runtime manufacturer scraping and root database access are prohibited.

## References

- [MySQL 8.4 release model](https://dev.mysql.com/doc/refman/8.4/en/mysql-releases.html)
- [Prisma MySQL connector](https://www.prisma.io/docs/orm/overview/databases/mysql)
- [Prisma 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
