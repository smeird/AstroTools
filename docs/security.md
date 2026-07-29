# Security foundation

- Status: Work Package 0 baseline
- Last reviewed: 29 July 2026
- Owner: Astrotools maintainers

Release 1 must not collect personal data or require accounts. Apache2 remains
the only public endpoint; application and database hardening is delivered in
later work packages under the canonical implementation plan. Next.js telemetry
is disabled in the documented development and CI build commands; no application
analytics are included.

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
