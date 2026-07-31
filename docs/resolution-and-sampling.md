# Resolution and Sampling

- Status: Work Package 11, first post-Release-1 calculator

The Resolution and Sampling calculator is a standalone planning tool at
`/calculators/resolution-and-sampling`. It keeps all ordinary interaction local
to the browser and uses canonical millimetres, nanometres, micrometres, and
arcseconds.

## Model

For a circular aperture, the ideal Rayleigh limit is:

\[ \theta_R = 1.22\frac{\lambda}{D} \]

The calculator converts the result from radians to arcseconds. It also shows the
empirical Dawes double-star estimate:

\[ \theta_D = \frac{116}{D_{mm}}\ \mathrm{arcseconds} \]

Image scale uses the existing canonical relation:

\[ \rho = 206.265\frac{p_{\mu m}}{f_{mm}} \]

where the pixel pitch includes binning. Pixels per Rayleigh limit and pixels per
seeing FWHM compare those angular scales with the detector sampling. Critical
focal length is the focal length that produces two pixels per Rayleigh limit for
the selected aperture, wavelength, pixel pitch, and binning.

## Interpretation and limits

The outputs describe ideal diffraction and detector geometry. Atmospheric
turbulence, focus, obstruction, tracking, contrast, processing, and target
brightness can reduce practical resolution. Seeing is therefore reported as a
separate comparison, not folded into the diffraction limit.

The Rayleigh relation follows the
[ESO introduction to spatial interferometry](https://www.eso.org/sci/facilities/paranal/telescopes/vlti/tuto/tutorial_spatial_interferometry.pdf).
The Dawes relation is a common empirical amateur-astronomy estimate and is
presented as an estimate rather than a physical limit.
