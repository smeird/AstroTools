# Focal Reducer and Barlow Effects

- Status: Work Package 12

The calculator at `/calculators/modifier-effects` compares an optical system
before and after one dimensionless focal-length multiplier. A factor below 1×
models a reducer; a factor above 1× models a Barlow or tele-extender.

The aperture remains fixed. Effective focal length is native focal length times
the factor, focal ratio is effective focal length divided by aperture, and the
field of view and image scale are recalculated from the modified focal length.
The model is ideal and does not claim to predict aberration, vignetting, spacing
sensitivity, or illumination changes in a specific product.
