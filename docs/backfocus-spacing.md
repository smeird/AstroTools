# Back-focus Spacing Calculator

- Status: Work Package 14

The calculator at `/calculators/backfocus-spacing` totals camera sensor depth,
filter wheel or drawer, off-axis guider, other adapters, and the installed
spacer stack. Inputs and results use millimetres and persist only in the local
browser.

For nominal back focus `B`, filter thickness `t`, refractive index `n`, and the
fixed mechanical train `Lfixed`, the first-order plane-parallel filter allowance
and required spacer are:

```text
c = t(1 - 1/n)
Lspacer = (B + c) - Lfixed
```

The signed spacing error is installed train length minus the corrected target. A
negative error means the train is short; a positive error means it is long. The
interface treats an absolute error no larger than 0.10 mm as within its display
tolerance, but a component manufacturer may specify a different tolerance.

The filter equation is a paraxial first-order estimate. Manufacturer reference
shoulders and specifications take precedence. Thread engagement, wavelength,
tilt, field curvature, and empirical corner-star behaviour can affect the final
setting.
