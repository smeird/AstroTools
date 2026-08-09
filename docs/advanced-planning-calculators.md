# Advanced planning calculators

Work Package 30 adds twelve local specialist calculators. They share the same
page grammar: compact technical figure, bounded numeric inputs, immediately
updated results, native MathML, a plain-language formula description and a
visible modelling caveat.

The calculation functions live in `lib/calculations/advanced-planning.ts` and
have no React, browser, database or framework dependencies. UI definitions in
`features/advanced-planning` adapt those results for display without rounding
the calculation itself.

## Shared imaging train

Applicable fields inherit effective focal length, binned pixel size, binned
resolution or focal ratio from `astrotools.shared.imaging-train.v1`. Each page
stores its own specialist measurements separately. A changed shared train
updates only fields derived from equipment; ordinary navigation does not reset
sky measurements, planning targets or operational assumptions.

Plate Solving inherits focal length, effective pixel size and binned image
dimensions; Drizzle inherits binned dimensions; Autofocus inherits focal ratio.
The remaining advanced calculators display the saved rig only as available
context and explicitly state that their specialist measurements are not stored
in the equipment profile. They never claim that equipment values were applied
when no field is mapped.

## Interpretation limits

Optimal exposure, guiding, extinction, imaging-window, rotation and autofocus
outputs are planning models. Their pages name the missing real-world effects and
avoid presenting estimates as calibrated measurements. Measured electron rates,
local extinction, mount motion and actual focal travel should replace defaults
whenever available.
