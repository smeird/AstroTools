# ADR-001: Run Next.js behind Apache2

- Status: Accepted
- Date: 29 July 2026

## Context

Astrotools needs server rendering, typed server/browser code, future catalogue
access, and deployment into an Apache HTTP Server 2.4 environment. Apache must
remain the only internet-facing security boundary.

## Decision

Build one strict TypeScript application with the current stable Next.js App
Router and React. Produce Next.js standalone output and run it as a Node.js 24
service bound only to `127.0.0.1`. Apache terminates TLS, redirects HTTP to
HTTPS, preserves the original host, supplies trusted forwarding headers, applies
request controls and response headers, and reverse-proxies to Node with
`ProxyRequests Off`.

The Node service trusts proxy headers only from local Apache. systemd runs it as
an unprivileged service account. Secrets remain outside the repository.

## Consequences

- One language and validation model spans browser, server, and tests.
- Apache configuration and application releases remain separate operational
  concerns.
- Direct public exposure of the Next.js port is unsupported.
- A static React/PHP split and Vinext/OpenAI Sites runtime are rejected because
  they add deployment or language boundaries without Release 1 value.

## References

- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Next.js Node.js deployment](https://nextjs.org/docs/app/getting-started/deploying)
- [Apache mod_proxy](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html)
