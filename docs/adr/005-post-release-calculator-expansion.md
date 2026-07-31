# ADR-005: Post-Release Calculator Expansion

- Status: Accepted
- Date: 2026-07-31

## Context

The production implementation plan defines Release 1 as the Field of View and
Image Sampling Lab and lists additional calculators as future scope. The user
has explicitly approved continuing with the next calculator after the Release 1
layout work was completed and verified.

The plan does not prescribe an order or detailed acceptance criteria for those
future modules. The first expansion therefore needs a bounded, independently
reviewable package rather than a broad calculator registry or a collection of
partially specified tools.

## Decision

The first post-Release-1 calculator is **Resolution and Sampling**, at
`/calculators/resolution-and-sampling`.

Its initial scope is limited to:

- Rayleigh diffraction limit from aperture and wavelength;
- Dawes empirical double-star estimate;
- image scale from focal length, pixel pitch, and binning;
- pixels per Rayleigh limit and pixels per seeing FWHM;
- critical focal length and focal ratio for two-pixel Rayleigh sampling;
- local, accessible interaction with explicit assumptions and limitations.

The calculator uses the pure calculation layer and remains separate from the
Field of View Lab until a shared abstraction is justified by a second real
calculator. It does not add catalogue writes, accounts, network requests for
ordinary control changes, or claims that diffraction estimates guarantee
real-world detail.

## Consequences

The existing Release 1 calculator remains unchanged as the production baseline.
The new route has its own feature component, tests, documentation, and
accessibility/e2e checks. Further calculators require another bounded decision
and must not be inferred from this package.
