# Operations

## Confirmed production profile

- Ubuntu 24.04 LTS
- Apache2 as the only public endpoint for `astrotools.smeird.com`
- Let's Encrypt certificate lifecycle managed by Certbot
- Next.js standalone Node process on `127.0.0.1:3100`, supervised by systemd
- MySQL 8.4 LTS on the same host, bound to `127.0.0.1`
- Direct, immutable versioned release directories with an atomic current link
- Prometheus/Alertmanager-compatible monitoring
- Nightly encrypted S3-compatible database backups with 30 daily restore points

No S3-compatible provider has been selected. Work Package 9 must choose the
destination, credentials mechanism, lifecycle policy, and restoration tooling
before production acceptance. The baseline's initial 24-hour recovery-point and
four-hour recovery-time objectives, plus quarterly restoration tests, remain the
working targets.

## Package boundary

Apache2, systemd, MySQL backup and restore, release, rollback, monitoring, and
alerting procedures arrive in Work Package 9. ADR-001 already fixes Apache2 as
the only public endpoint and the standalone Node service as loopback-only. Work
Package 3 adds only the catalogue schema, services, test database integration,
and safe MySQL identity template; it does not make this a deployable production
topology.

Version-controlled examples may name the public domain but must not contain a
real certificate path, credential, backup location, or other host-specific
secret. Deploying Apache, systemd, MySQL, certificate, monitoring, or backup
configuration always requires separate operational approval.

See [ADR-004](adr/004-production-profile-and-catalogue-governance.md) for the
confirmed decisions and [ops/mysql/README.md](../ops/mysql/README.md) for the
non-deploying least-privilege template.
