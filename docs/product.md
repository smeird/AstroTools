# Product baseline

- Status: implementation baseline
- Prepared for: Codex
- Date: 29 July 2026

The canonical product and engineering requirements are preserved verbatim in
[`Astrotools_Production_Implementation_Plan.md`](../Astrotools_Production_Implementation_Plan.md).
This page is only a navigation summary and cannot narrow that baseline.

Release 1 is the Field of View and Image Sampling lab. It must let an
astrophotographer determine:

1. the exact angular field captured by telescope, modifier, and camera;
2. whether a recognisable target fits the proportional frame;
3. the image scale in arcseconds per pixel; and
4. a qualified sampling assessment relative to stated seeing.

The experience requires no account and serialises complete state into a stable,
versioned URL. It must remain scientifically honest about exact calculations,
approximations, judgement thresholds, and illustrative imagery. Apache2 is the
public security boundary, Next.js is the application, and MySQL stores durable
catalogue data.

Do not interpret the future-calculator list as Release 1 scope. Do not add
social, commerce, telescope-control, plate-solving, native-app, subscription,
mandatory account, or OpenAI runtime features without a separate product
decision.
