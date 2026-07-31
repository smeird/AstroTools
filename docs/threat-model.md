# Threat model

## Scope

Astrotools is a public, unauthenticated Next.js calculator behind Apache2. It
stores reviewed public equipment and target catalogue data in local MySQL. There
are no accounts, uploads, payments, analytics, or write APIs in Release 1.

## Principal threats and controls

| Threat                                        | Control                                                                                 | Residual risk                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Malformed URL state or catalogue queries      | Strict Zod schemas, bounded values, pagination, and safe public errors                  | Valid but unusual calculator values remain user supplied               |
| SQL injection or excessive database authority | Prisma parameterisation, loopback-only URLs, and table-level SELECT runtime grants      | Controlled migration identity retains schema authority during releases |
| Secret disclosure                             | Root-controlled environment files, no secret logging, no diagnostic stack traces        | Server operators retain privileged access                              |
| Browser script injection                      | CSP without `unsafe-eval`, no third-party scripts, controlled static SVG assets         | Framework bootstrap needs reviewed inline support                      |
| Public Node or MySQL exposure                 | Apache-only public endpoint and loopback runtime topology                               | Enforcement configuration is delivered in Work Package 9               |
| Dependency compromise                         | Exact lockfile, production dependency audit, reviewed overrides, GitHub secret scanning | Development-only advisories are tracked in security documentation      |

## Review triggers

Re-review this model before adding authentication, writes, uploads, external
integrations, remote database connectivity, analytics, or a new calculator with
materially different inputs.
