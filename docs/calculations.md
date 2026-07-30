# Calculation engine

- Status: Work Package 1 implementation
- Date: 29 July 2026

The field-of-view and image-sampling engine is a pure TypeScript library under
`lib/calculations/`. It imports no React, DOM, Next.js, Prisma, database,
network, or feature code. ESLint enforces that boundary. The same deterministic
functions can therefore run in a browser, server render, test process, or later
worker without changing their results.

## Canonical units

| Quantity                                  | Canonical unit   |
| ----------------------------------------- | ---------------- |
| Aperture, focal length, sensor dimensions | millimetres (mm) |
| Native and effective pixel pitch          | micrometres (µm) |
| Seeing and image scale                    | arcseconds (″)   |
| Angular dimensions                        | degrees (°)      |
| Optical modifiers and focal ratio         | dimensionless    |

Millimetres are converted to inches only for display and substituted equations,
using exactly `25.4 mm = 1 in`. The calculator always receives canonical values.
The conversion functions return unrounded numbers, and unit round-trip tests
prove that angular results remain unchanged.

## Optical train

For native focal length \(f_n\) and zero or more modifier multipliers \(m_i\):

\[ f_e = f_n \prod_{i=1}^{n} m_i \]

An empty modifier chain has product 1. A 0.7× reducer followed by a 2× Barlow
therefore changes 1000 mm to 1400 mm. The mathematical product is independent of
modifier order; a representative order-invariance case is covered by tests.

For aperture \(D\), the effective focal ratio is:

\[ N_e = \frac{f_e}{D} \]

Aperture is used for focal ratio only. Tests explicitly prove that changing
aperture cannot alter effective focal length or field of view.

Direct native focal length is the default application input. Work Package 4 also
exposes a deliberate alternate mode that derives native focal length from
aperture and a native focal ratio:

\[ f_n = D N_n \]

The derivation is a pure engine function and retains full precision. Switching
to this mode makes the coupling explicit; in direct mode, editing aperture still
cannot change the field of view. Switching back preserves the currently derived
focal length as the new direct value.

## Sensor dimensions

Known physical sensor dimensions pass through unchanged. When only resolution
and native pixel pitch are known:

\[ d_x = \frac{p_x s}{1000}, \qquad d_y = \frac{p_y s}{1000}, \qquad d_d =
\sqrt{d_x^2 + d_y^2} \]

Here \(p_x\) and \(p_y\) are positive integer pixel counts, \(s\) is native
pixel pitch in micrometres, and the dimensions are returned in millimetres.
`Math.hypot` is used for the diagonal to avoid avoidable intermediate overflow.
Catalogue discrepancy checking at the 0.1 mm tolerance remains a Work Package 3
seed-validation concern.

## Exact field of view

For sensor extent \(d\) and effective focal length \(f_e\):

\[ \theta = 2\arctan\left(\frac{d}{2f_e}\right)\frac{180}{\pi} \]

The equation is evaluated independently for horizontal, vertical, and diagonal
sensor extents. This exact arctangent result is authoritative. The small-angle
approximation may later be shown for education, but is not used by the engine. A
deliberately wide 90° golden test distinguishes the two equations.

## Image scale, seeing, and sampling

For native pixel pitch \(s\) and positive integer binning factor \(b\):

\[ s_e = sb \]

\[ \rho = \frac{206.265s_e}{f_e} \]

Image scale \(\rho\) is expressed in arcseconds per pixel. For seeing full width
at half maximum \(\sigma\):

\[ P_{\mathrm{FWHM}} = \frac{\sigma}{\rho} \]

The central, immutable default thresholds are:

| Pixels per seeing FWHM | Assessment          |
| ---------------------- | ------------------- |
| Less than 2            | likely undersampled |
| 2 through 4, inclusive | broadly appropriate |
| More than 4            | likely oversampled  |

These are qualified planning defaults, not universal laws. Tracking, focus,
optics, processing method, target type, and the distinction between true
hardware binning and software resampling can all change their interpretation.
Binning changes effective pixel pitch and image scale; it cannot change field of
view.

## Public contract

The public barrel is `lib/calculations/index.ts`. It exports typed primitive
functions for every equation plus `calculateImagingSystem`, which composes a
complete result from:

- native focal length and aperture;
- an optional readonly modifier chain;
- physical sensor dimensions or pixel resolution with native pitch;
- a positive integer binning factor; and
- positive seeing FWHM in arcseconds.

The result contains effective focal length and ratio, resolved sensor
dimensions, exact field dimensions, effective pixel pitch, image scale, pixels
per seeing FWHM, and the qualified sampling assessment. Inputs and outputs carry
their units in property names and are readonly at the TypeScript boundary.

## Numerical policy

- All calculations retain JavaScript `Number` precision and are deterministic.
- No engine function rounds, formats, clamps, or feeds display values back into
  another equation.
- All physical quantities must be finite and greater than zero.
- Resolution and binning must be positive safe integers.
- Invalid values, unsafe counts, and intermediate overflow or underflow throw a
  `CalculationInputError` naming the failing parameter.
- Multiplicative equations use a normalized binary mantissa and exponent so
  canceling factors and representable extreme results do not fail because of an
  avoidable intermediate overflow.
- Extreme but representable wide and narrow fields remain valid.
- Zod will validate untrusted form, URL, and API data at those later boundaries;
  it is intentionally absent from the pure engine.

## Independently verified golden case

The primary fixture uses a 1000 mm native focal length, 200 mm aperture, 0.7×
and 2× modifiers, a 9576 × 6388 sensor at 3.76 µm, binning 2, and 2.4″ seeing.
Expected values were evaluated separately from the TypeScript implementation
with `bc -l`, a scale of 100 decimal places, and \(\pi = 4\arctan(1)\).

| Result                 |       Frozen expectation |
| ---------------------- | -----------------------: |
| Effective focal length |                  1400 mm |
| Effective focal ratio  |                      f/7 |
| Sensor dimensions      |   36.00576 × 24.01888 mm |
| Sensor diagonal        |    43.281882464051861 mm |
| Horizontal field       |       1.473474561971489° |
| Vertical field         |       0.982961927640769° |
| Diagonal field         |       1.771194075872283° |
| Effective pixel pitch  |                  7.52 µm |
| Image scale            | 1.107937714285714″/pixel |
| Pixels per seeing FWHM |        2.166186753149094 |
| Assessment             |      broadly appropriate |

Tests compare trigonometric results within `1e-12` absolute precision and keep
the high-precision expectations as literals. The implementation under test is
never used to manufacture its own golden values.

## Known equipment verification

A second fixture uses manufacturer-published specifications, verified on 29 July
2026:

- [Sky-Watcher EVOSTAR 80EDX](https://www.skywatcher.com/product/evostar-80edx/):
  80 mm aperture and 600 mm focal length (f/7.5).
- [ZWO ASI2600MC/MM Pro](https://www.zwoastro.com/product/new-asi2600mm-mc-pro/):
  6248 × 4176 resolution and 3.76 µm native pixels.

With no modifier, binning 1, and 2.0″ seeing, the independent reference produces
a 2.243080057669° × 1.499322068146° field, 1.292594″/pixel image scale, and
1.547276252249 pixels per seeing FWHM: likely undersampled under the qualified
default threshold. The test derives 23.49248 × 15.70176 mm from resolution and
pitch; its difference from ZWO's rounded physical dimensions is below the future
catalogue's 0.1 mm discrepancy tolerance.
