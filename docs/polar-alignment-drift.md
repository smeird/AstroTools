# Drift and Polar-Alignment Error Calculator

- Status: Work Package 17

The calculator at `/calculators/polar-alignment-drift` converts signed detector
drift to sky drift with the full effective imaging train, then estimates the
small-angle polar-axis error permitted by the observing geometry.

The azimuth sensitivity is `cos(latitude) cos(hour angle)` and altitude
sensitivity is `sin(hour angle)`. Near the meridian the altitude solution is
suppressed; near six hours east or west the azimuth solution is suppressed.
Low-sensitivity estimates are reported as unavailable rather than amplified.

The model assumes one polar-error axis is tested at a time. Refraction, periodic
error, flexure, poor seeing, camera rotation and mount behaviour can contaminate
measured drift. The detector sign must be mapped to celestial north or south
before making a directional mount adjustment.
