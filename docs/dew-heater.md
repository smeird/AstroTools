# Dew Point and Heater Power Calculator

- Status: Work Package 20

Uses the Magnus approximation for dew point and reports ambient margin, a
configurable target above dew point, and a first-order heater-band power/current
estimate. Wind, sky radiation, insulation, cell mass and controller placement
remain explicit limitations.

When a saved imaging train is available, telescope aperture supplies the optic
diameter. Heater-band width, environmental readings, efficiency, voltage and
heat-loss assumptions remain calculator-specific and locally persisted.
