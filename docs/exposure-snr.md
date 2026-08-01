# Exposure and Signal-to-Noise Calculator

- Status: Work Package 18

The calculator at `/calculators/exposure-snr` applies the saved effective focal
length, camera pixel pitch and binning. Source and sky rates are electrons per
second per square arcsecond, so binned-pixel sky area converts them to electrons
per sub-exposure.

Stack variance includes source and sky shot noise, dark-current shot noise and
read-noise variance once per frame. Rates should preferably come from calibrated
linear data. The estimate excludes flat-field residuals, gradients, clipping,
registration and rejection losses, correlated noise and target structure.
