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

## Subsequent bounded decisions

On 2026-07-31, the user approved continuing through the plan in sequence. The
second package delivered Focal Reducer and Barlow Effects. The next bounded
package is **Sensor Tilt**, at `/calculators/sensor-tilt`.

Sensor Tilt accepts physical sensor dimensions, signed focus differences across
the horizontal and vertical axes, and centre-to-adjuster distance. It reports
the two axis angles, combined plane tilt, corner-to-corner focus difference, and
the equivalent adjustment magnitude. The calculation is explicitly a plane
model: it does not attribute all focus variation to mechanical tilt or attempt
to separate field curvature, optical aberration, sag, seeing, or measurement
noise.

On 2026-08-01, the next bounded package was approved as **Back-focus Spacing**
at `/calculators/backfocus-spacing`. It totals the mechanical imaging train,
applies the first-order plane-parallel filter focus allowance, and reports the
required spacer and signed error. It is a planning model, not a substitute for
manufacturer-specific reference shoulders, tolerances, or empirical star tests.

The same package standardises the post-Release-1 calculators on native MathML
for textbook-style fractions, subscripts, roots, and symbolic expressions. The
original Field of View calculator already uses this equation system.

On 2026-08-01, the next approved calculator in the plan sequence is **Guiding
Ratio**, at `/calculators/guiding-ratio`. It compares the main and guide image
scales and expresses the guide-camera centroid movement corresponding to half an
imaging pixel. The ratio is descriptive rather than a universal pass/fail
threshold because centroid accuracy and guiding performance depend on star
signal, seeing, exposure, mount response, calibration, flexure, and software.

The next approved package is **Drift and Polar-Alignment Error**, at
`/calculators/polar-alignment-drift`. It converts signed pixel drift through the
complete effective imaging train and uses hour angle and observer latitude to
estimate small-angle azimuth and altitude polar-axis errors. It reports
low-sensitivity geometries as unavailable and does not present detector sign as
a mount-adjustment direction without camera-orientation calibration.

The next approved package is **Exposure and Signal-to-Noise Estimation**, at
`/calculators/exposure-snr`. It uses the complete effective imaging train to
derive binned-pixel sky area and combines user-supplied source, sky, dark and
read-noise measurements across a stack. Rates are explicitly post-throughput
electron rates rather than an invented catalogue brightness.

The next approved package is **Mosaic Planning**, at
`/calculators/mosaic-planning`. It derives exact panel field from the complete
optical train and finds the minimum aligned grid that covers a target extent at
the requested overlap. Rotation and operational cropping remain explicit
limitations rather than hidden margins.
