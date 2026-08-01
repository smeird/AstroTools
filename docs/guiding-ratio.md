# Guiding Ratio Calculator

- Status: Work Package 16

The calculator at `/calculators/guiding-ratio` compares the angular image scale
of the main imaging train and guide train. It reports both scales, their ratio,
and the guide-camera centroid movement corresponding to half an imaging pixel.

It uses `s = 206.265 × p × b / f`, with pixel pitch in micrometres, focal length
in millimetres, and binning dimensionless. Results retain full precision until
display formatting. Main-camera and telescope values follow the saved equipment
selection; guide equipment remains calculator-specific and is stored locally.

The ratio is descriptive, not a pass/fail threshold. Sub-pixel centroiding means
a coarse guide scale can still work, while star signal, seeing, exposure time,
mount response, calibration, differential flexure, and software settings can
dominate real performance.
