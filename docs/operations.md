# Operations

## Confirmed production profile

- Ubuntu 24.04 LTS
- Apache2 as the only public endpoint for `astrotools.smeird.com`
- Let's Encrypt certificate lifecycle managed by Certbot
- Next.js standalone Node process on `127.0.0.1:3100`, supervised by systemd
- MySQL 8.4 LTS on the same host, bound to `127.0.0.1`
- Direct, immutable versioned release directories with atomic `current` and
  `previous` symlinks
- Prometheus/Alertmanager-compatible monitoring
- Encrypted database backups with 30 daily restore points

The repository provides encrypted local dump and restore scripts plus a
Prometheus textfile metric. The final off-host destination, credentials
mechanism, lifecycle policy, and restoration schedule require operator approval.
The working objectives are a 24-hour recovery point, four-hour recovery time,
and quarterly restoration tests.

## Release deployment

The production host uses `/var/www/AstroTools` with immutable directories under
`releases/`, an atomic `current` symlink, and a `previous` rollback symlink.
From the reviewed checkout, run the release script as root:

```bash
sudo BACKUP_BEFORE_MIGRATION=1 scripts/deploy-release.sh
```

The script archives the reviewed commit, installs exact dependencies, applies
production migrations with the short-lived migration environment, seeds the
catalogue, builds the standalone Next.js server, switches the symlink, restarts
systemd, and waits for `/api/health/ready`. It does not put migration
credentials in the long-running service environment.

When `BACKUP_BEFORE_MIGRATION=1`, the release also requires the protected
`/etc/astrotools/mysql-backup.cnf` client file and `/etc/astrotools/backup.env`
GPG-recipient configuration. It stops before migrations if either is absent.

The release step installs development dependencies explicitly because Prisma's
migration CLI and the `tsx` seed runner are build-time tools. The immutable
release then contains only Next's traced standalone runtime and the MySQL backup
entry point; root dependencies, source files, tests, and build caches remain in
the disposable staging directory.

Next's writable prerender cache is release-specific under
`shared/next-cache/<release-id>` and is linked into the standalone tree. This
keeps the release immutable under systemd's `ProtectSystem=strict` while making
rollback return to the matching cache.

To restore the last application release:

```bash
sudo scripts/rollback-release.sh
```

## Disk cleanup

Release directories contain the compact standalone application and its traced
production dependencies. The cleanup utility is report-only by default, protects
both the `current` and `previous` release symlinks, and removes a deleted
release's matching shared Next cache:

```bash
cd /var/www/AstroTools
sudo scripts/cleanup-server.sh
```

Review the candidates, then explicitly apply the cleanup. This keeps the two
newest unprotected releases and removes staging directories older than seven
days:

```bash
sudo scripts/cleanup-server.sh --apply
```

If the checkout itself contains reproducible dependencies or old build and test
caches, they can be removed only when the service uses an atomic `current`
release symlink:

```bash
sudo scripts/cleanup-server.sh --clean-checkout-caches
sudo scripts/cleanup-server.sh --clean-checkout-caches --apply
```

Keep more releases when rollback capacity requires it:

```bash
sudo scripts/cleanup-server.sh --keep-releases 4 --apply
```

The script never removes the active or rollback release and refuses cache
cleanup when the service may be running directly from the checkout.

Database rollback is separate from application rollback. A schema migration must
have an explicitly reviewed forward-compatible rollback plan before it is
deployed.

## Apache and maintenance mode

Install `ops/apache/astrotools.conf`, enable the required proxy, TLS, headers,
rewrite, compression, and cache modules, then run `apachectl configtest` before
reloading Apache. Certbot owns the certificate files. A controlled maintenance
page is enabled by installing `ops/apache/maintenance.conf.example` as
`/etc/astrotools/maintenance.conf` and creating
`/etc/astrotools/maintenance.enabled`.

## Operational checks

```bash
sudo scripts/smoke-test.sh
sudo systemctl --no-pager --full status astrotools
sudo journalctl -u astrotools -n 100 --no-pager
sudo tail -n 100 /var/log/apache2/astrotools-error.log
```

Prometheus rules are supplied in `ops/prometheus/astrotools.rules.yml`; label
names must be aligned with the installed blackbox-exporter and node-exporter
jobs during operational acceptance.

The optional nightly backup units are `ops/systemd/astrotools-backup.service`
and `ops/systemd/astrotools-backup.timer`. Install the protected backup
environment and MySQL client files first, then enable the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now astrotools-backup.timer
sudo systemctl list-timers astrotools-backup.timer
```

## Package boundary and safety

ADR-001 fixes Apache2 as the only public endpoint and the standalone Node
service as loopback-only. MySQL identity templates remain in `ops/mysql/`, and
MySQL must keep `bind-address = 127.0.0.1`. Version-controlled examples never
contain real certificate paths, credentials, backup locations, or other
host-specific secrets. Deploying Apache, systemd, MySQL, certificates,
monitoring, or backup configuration requires separate operational approval.

See [ADR-004](adr/004-production-profile-and-catalogue-governance.md) and
[ops/mysql/README.md](../ops/mysql/README.md) for the accepted profile and
least-privilege model.
