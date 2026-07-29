# Astrotools contributor guide

## Baseline and scope

The authoritative product baseline is
`Astrotools_Production_Implementation_Plan.md`. Implement one work package per
coherent task. Do not begin the next package while the current package has known
acceptance failures unless a written decision defers them. Release 1 is the
Field of View and Image Sampling calculator; later calculators are out of scope.

Structure implementation work as:

- **Goal:** user-visible or operational outcome.
- **Context:** relevant source, ADRs, and existing behaviour.
- **Constraints:** applicable baseline requirements and non-negotiables.
- **Done when:** explicit acceptance criteria and checks.

## Repository layout

- `app/`: Next.js App Router pages and API route handlers.
- `components/`: shared presentation primitives, equations, and visualisations.
- `features/field-of-view/`: calculator-specific UI, model, schemas, and
  services.
- `lib/calculations/`: pure domain calculations; no React, DOM, database, or
  framework imports.
- `lib/db/`, `lib/observability/`, `lib/security/`: infrastructure boundaries.
- `prisma/`: MySQL schema, migrations, and idempotent catalogue seed.
- `tests/`: fixtures plus integration and Playwright end-to-end tests.
- `docs/adr/`: accepted architecture decisions. Update an ADR when its decision
  changes.
- `ops/`: Apache, systemd, and MySQL deployment examples; deployment itself
  always requires operational approval.

## Commands

Use Node 24.18.0 and npm 11.16.0. Install only from the committed lockfile in
CI:

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run test:integration
npm run test:e2e
npm run build
```

Development and standalone production previews bind to `127.0.0.1:3100` by
default. Keep Playwright and the future Apache proxy target aligned with this
port.

Database commands are configured now but catalogue models arrive in Work Package
3:

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:migrate:deploy
npm run db:seed
```

Create `.env` from `.env.example` and replace the placeholder database password
before running any database command. Never use production credentials for
development migration or seed commands.

`db:migrate:dev` is development-only. Production releases may run only
`db:migrate:deploy` with controlled migration credentials.

## Engineering constraints

- TypeScript is strict. Validate untrusted input at the boundary with Zod.
- Use canonical millimetres, micrometres, arcseconds, degrees, and dimensionless
  multipliers. Unit switches are presentation-only.
- Keep full `Number` precision through calculations and round only in
  formatters.
- Keep calculator interaction local; ordinary control changes must not need a
  network request.
- Focal length is the primary field-of-view input. Aperture affects focal ratio,
  not field of view independently.
- Display zoom must never affect calculated field of view or target proportions.
- Accessibility targets WCAG 2.2 AA: semantic HTML, keyboard access, visible
  focus, 44px touch targets, reduced motion, sufficient contrast, and useful
  non-visual equivalents.
- Do not commit secrets, real certificate paths, credentials, personal data,
  generated Prisma clients, build output, or environment-specific paths.
- Pin direct dependency versions exactly. Commit `package-lock.json` changes
  with dependency changes.
- Run `npm run audit:production` for the blocking runtime-dependency gate and
  review `npm run audit:all` against `docs/security.md`; never hide or
  cross-major-force a tooling advisory.
- Treat npm's `allowScripts` manifest field as a reviewed advisory inventory,
  not as an execution sandbox.
- MySQL uses DECIMAL for catalogue measurements, InnoDB, provenance on every
  record, and a least-privilege non-root application identity.
- Apache2 is the sole public endpoint. Node listens on loopback and trusts
  forwarding information only from local Apache.
- Add shared abstractions only when the first real calculator demonstrates the
  need.

## Verification and definition of done

Every change includes tests and documentation for the behaviour it changes. Run
type checking, linting, formatting, affected unit/integration tests, and a
production build. Run Playwright and inspect the browser for user-visible work;
record any environment-limited check explicitly. Consider accessibility,
security, privacy, and migrations. Review the final diff for unrelated changes,
secrets, generated credentials, and compliance with the active work package.
Never report completion without reviewing actual command results.

Before Work Package 3, resolve the nine product decisions listed in the baseline
or explicitly adopt its defaults.

## Delivery workflow

After a work package satisfies its definition of done, commit it on its
`agent/*` branch, push it, merge it into `main`, and provide the user with the
exact CLI commands appropriate to deploy that merged state. Never merge known
failing work. Clearly distinguish a local or loopback preview from the complete
Apache2 production deployment, which is not available until its operational
package and approvals exist.
