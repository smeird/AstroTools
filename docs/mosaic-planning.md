# Mosaic Planning Calculator

- Status: Work Package 19

The calculator at `/calculators/mosaic-planning` uses the saved effective focal
length and sensor dimensions to calculate exact single-panel field of view. It
then finds the smallest aligned rectangular grid that covers the entered target
extent with the requested adjacent-panel overlap.

Results include columns, rows, panel count, achieved coverage, overlap, edge
margin and total integration. The plan assumes target and sensor axes are
aligned; rotation, distortion, dithering, plate-solving error and stacking crops
require additional margin.
