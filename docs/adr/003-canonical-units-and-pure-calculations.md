# ADR-003: Canonical units and a pure calculation engine

- Status: Accepted
- Date: 29 July 2026

## Context

Field-of-view and sampling results must be reproducible in the browser, testable
independently from React and MySQL, and invariant under display-unit changes.

## Decision

Place domain mathematics in pure TypeScript functions under `lib/calculations/`.
They may not import React, DOM, database, network, or framework APIs.

Use these canonical units:

- millimetres for aperture, focal length, and physical sensor dimensions;
- micrometres for native pixel pitch;
- arcseconds for seeing and image scale;
- degrees for stored angular dimensions; and
- dimensionless optical multipliers.

Use full JavaScript `Number` precision. Round only in presentation helpers and
never feed display values back into calculations. The millimetre/inch control
changes display and substituted-equation units only.

The exact field calculation uses `2 × arctan(sensor / (2 × focal length))`; the
small-angle approximation may be explanatory but not authoritative. Sampling
thresholds are centralised, qualified constants with tests.

## Consequences

- The same engine runs locally in the browser without API latency.
- Golden, extreme-input, and dimensional-invariance tests are mandatory.
- Components receive typed results and cannot own scientific rules.
- Later calculators may reuse proven primitives, but abstractions are extracted
  only after real usage demonstrates them.
