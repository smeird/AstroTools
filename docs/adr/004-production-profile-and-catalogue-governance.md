# ADR-004: Production profile and catalogue governance

- Status: Accepted
- Date: 30 July 2026

## Context

Section 19 of the implementation baseline requires nine product decisions before
catalogue implementation. The production host and operational tooling also
constrain how the Work Package 3 database boundary is tested and documented.

## Decision

Adopt this initial production profile:

- Ubuntu 24.04 LTS;
- MySQL 8.4 LTS on the application host, bound to `127.0.0.1`;
- Next.js standalone Node on `127.0.0.1:3100` under systemd;
- direct, immutable versioned release directories;
- `https://astrotools.smeird.com`, with Let's Encrypt certificates managed by
  Certbot;
- Prometheus/Alertmanager-compatible monitoring;
- nightly encrypted S3-compatible backups with 30 daily restore points; and
- no anonymous analytics or non-essential tracking.

The backup provider is intentionally unspecified. Work Package 9 must select a
provider and document keys, lifecycle, restoration, monitoring, and operational
approval without changing the interface established here.

Catalogue administration is repository-driven; Release 1 has no protected
administration UI. Target visuals must have repository evidence of their exact
public-domain or Creative Commons source, licence, attribution, and verification
date. Where that evidence is unavailable or unsuitable, use an internally
created representation and disclose that it is illustrative.

## Consequences

- Work Package 3 integration tests run against MySQL 8.4.10 with disposable,
  non-root credentials.
- The application runtime and controlled migration step use distinct database
  identities in production.
- MySQL and Node are not publicly reachable; Apache remains the sole public
  endpoint.
- Catalogue changes require normal source review, provenance validation, and an
  idempotent seed. There is no runtime scraping or administration surface.
- This ADR fixes targets and boundaries, not deployment. Apache, systemd,
  Certbot, monitoring, backup, restore, rollback, and release artifacts remain
  Work Package 9 and require operational approval.

## References

- [Astrotools implementation baseline](../../Astrotools_Production_Implementation_Plan.md)
- [ADR-001: Next.js behind Apache2](001-nextjs-behind-apache.md)
- [ADR-002: MySQL 8.4 and Prisma](002-mysql-and-prisma.md)
