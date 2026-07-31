# Security foundation

- Status: Work Package 8 hardening baseline
- Last reviewed: 30 July 2026
- Owner: Astrotools maintainers

Release 1 must not collect personal data or require accounts. Apache2 remains
the only public endpoint; application and database hardening is delivered in
later work packages under the canonical implementation plan. Next.js telemetry
is disabled in the documented development and CI build commands; no application
analytics are included.

## Application boundary

The application sets a defence-in-depth response-header baseline in Next.js and
Apache repeats public-edge headers in Work Package 9. It includes `nosniff`,
same-origin framing, restrictive referrer and permissions policies, and a
Content Security Policy with no `unsafe-eval`. Inline framework bootstrap/style
support remains explicitly limited to same-origin pages; a nonce-based CSP and
HTTPS-only `upgrade-insecure-requests` policy belong at the Apache TLS boundary,
not the loopback Node response, and are deferred until that delivery model is
exercised together.

Route and global error boundaries present safe recovery language without stack
traces, SQL details, connection strings, or request values. Operational events
are bounded JSON objects containing only route, status, duration, correlation
identifier, error name, and event type. Request bodies, cookies, authorisation
headers, raw query strings, and database URLs are never accepted by logging.

## Catalogue and database controls

MySQL 8.4 LTS runs on the Ubuntu 24.04 application host and binds to
`127.0.0.1`. The application must not connect as MySQL root. Its runtime
identity receives only the permissions needed for read-only catalogue access; a
separate migration identity is injected as `MIGRATION_DATABASE_URL` only during
a controlled release. Connection URLs and backup credentials remain outside the
repository in root-controlled environment files or an approved secret store.
Runtime SELECT grants enumerate the five API-readable catalogue tables rather
than using a database wildcard, so change history, migration metadata, and
future tables are denied by default.

CI uses separate literal, disposable migration and SELECT-only runtime
credentials with an isolated MySQL service. The integration suite proves that
the runtime identity cannot write. Those identities have no authority outside
that ephemeral job and must never be reused in a deployed environment. Runtime
configuration rejects root and non-loopback database connections. Catalogue
input is repository-reviewed, boundary-validated and queried through
parameterised Prisma access. Runtime manufacturer or asset scraping is
prohibited.

Versioned calculator URLs contain only whitelisted calculator state. Parsing
uses strict decimal grammar, per-field ranges, scalar-duplicate rejection,
bounded modifier repetition, known-value length limits, and a total query-size
limit. Unknown parameters are ignored and never copied into a canonical link;
raw invalid values are neither rendered nor logged. Sharing performs no write to
MySQL and introduces no user, short-link, analytics, or personal-data table. The
runtime identity's existing SELECT-only grants cover the bounded detail reads
used to preserve inactive equipment in old URLs.

The runtime pool bounds connection acquisition, initial connection, and pool
initialisation to two seconds. MySQL's session `max_execution_time` separately
bounds read-only SELECT execution without treating healthy idle sockets as
failed connections. The readiness endpoint also has its own two-second response
deadline so a stalled driver promise cannot hold the health request open. These
are deliberately distinct controls; the MariaDB connector's `socketTimeout` and
`queryTimeout` options are not used because the former expires idle pooled
connections and the latter is not supported against MySQL.

MySQL 8.4's default `caching_sha2_password` authentication may require a server
RSA key on a connection's first full authentication. The runtime connector may
retrieve that public key only because database URLs are rejected unless they use
the same-host loopback interface. If the accepted topology ever moves MySQL to a
private remote host, TLS and an explicitly trusted key replace this exception.

Nightly backups are encrypted before or during transfer to an S3-compatible
destination and retain 30 daily restore points. Provider selection, key
rotation, restore testing, and deployment are Work Package 9 concerns. No
analytics or non-essential tracking is authorised.

## Dependency audit policy

`npm run audit:production` is the blocking CI gate for high-severity findings in
the deployed dependency tree. `npm run audit:all` remains intentionally visible
for the complete development-tool tree.

The full-tree audit currently reports `GHSA-mh99-v99m-4gvg` through
`brace-expansion` used by lint tooling. The vulnerable code is development-only,
receives no application or user input, and is absent from the production audit.
A cross-major override was rejected because it breaks the callable API expected
by ESLint plugins. Remove this exception when the ESLint dependency chain
publishes compatible patched ranges; review it with every dependency update.

## Temporary Next.js compatibility overrides

Next.js 16.2.12 declares Sharp `^0.34.5` and pins an older PostCSS release. The
manifest scopes these patched versions only beneath that exact Next.js release:

- Sharp 0.35.3 addresses `GHSA-f88m-g3jw-g9cj`. It is outside Next.js's declared
  semver range, so the integration suite exercises Next's actual image optimizer
  pipeline and the production browser suite runs the standalone server. Remove
  the override as soon as Next.js declares a patched compatible range.
- PostCSS 8.5.24 addresses `GHSA-r28c-9q8g-f849`. Revalidate the override with
  every Next.js update and remove it once the framework's dependency is patched.

Direct dependencies and these two scoped overrides are pinned exactly in the
lockfile. npm 11.16's `allowScripts` field records reviewed lifecycle scripts
and warns about additions; it is advisory in that npm release and is not treated
as a security boundary.
