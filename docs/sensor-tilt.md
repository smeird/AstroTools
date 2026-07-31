# Sensor Tilt Calculator

- Status: Work Package 13

The calculator at `/calculators/sensor-tilt` converts signed focus differences
across a rectangular sensor into a geometric plane-tilt estimate. Settings are
versioned in local browser storage and ordinary changes require no network
request.

For sensor width `w`, height `h`, horizontal focus difference `Δx`, and vertical
focus difference `Δy`, with all lengths converted to the same unit:

```text
θx = atan(Δx / w)
θy = atan(Δy / h)
θ  = atan(sqrt((Δx / w)² + (Δy / h)²))
```

The corner-to-corner focus difference is `sqrt(Δx² + Δy²)`. At radial adjuster
distance `r`, the equivalent correction magnitude is
`r × sqrt((Δx / w)² + (Δy / h)²)`.

Positive focus differences mean that the right or bottom edge focuses farther
away than the left or top reference edge. The combined result is a magnitude;
the signed axis results retain direction.

This ideal plane model cannot distinguish mechanical sensor tilt from field
curvature, aberration, focuser or camera sag, seeing, or measurement noise.
Users should base corrections on repeated focus measurements and confirm them
with new exposures.
