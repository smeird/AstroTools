# Target framing geometry

- Status: Work Package 5 implementation
- Date: 30 July 2026

The framing simulator compares the exact field returned by the calculation
engine with a catalogue target's angular bounding footprint. Its geometry is a
pure feature model in features/field-of-view/model/target-framing.ts; React only
renders the returned coordinates.

## Scientific boundary

The sensor field is exact for the supplied focal length, modifier chain, and
sensor dimensions. A target width and height are catalogue angular extents and
therefore a planning footprint, not a prediction of surface brightness or the
limit of faint structure. The centred fit result is geometric only. It does not
account for tracking, focus, optical aberrations, dithering, processing, or a
user's desired composition.

Target illustrations are recognisable, deterministic guides. They are not
calibrated sky-survey images, do not encode brightness, and are never used as
the source of angular dimensions.

## Coordinates and orientation

The angular scene is centred at (0°, 0°). North is up and east is left in the
display. `defaultRotationDeg` stores the catalogue position angle in the
astronomical convention: degrees from celestial north through east, canonical in
the interval 0° inclusive to 180° exclusive. The display converts that position
angle to its clockwise-from-horizontal SVG convention:

    display rotation = 90° − catalogue position angle

Equivalent rectangle axes are normalized modulo 180°. The catalogue position
angle is independent of the user-controlled sensor-frame rotation, for which a
positive value is clockwise. A half-turn is direction-neutral in explanatory
text because +180° and −180° describe the same frame line.

Landscape places the longer calculated field axis horizontally; portrait swaps
the displayed axes. Neither orientation changes the canonical horizontal,
vertical, or diagonal field returned by the calculation engine.

For a rectangle corner (x, y) and rotation α, the model evaluates:

    x′ = x cos α − y sin α
    y′ = x sin α + y cos α

The target's four converted and rotated bounding-box corners are transformed
into the rotated sensor-frame axes. The target fits only when every corner lies
within both sensor half-extents. Returned horizontal and vertical margins are
total angular clearance; negative values identify cropping.

## Display zoom, grid, and scale

The unzoomed viewport fits the rotated sensor and target bounds with
deterministic padding. Display zoom divides only that viewport:

    displayed angular span = base angular span / display zoom

It cannot modify calculated field dimensions, target dimensions, target-to-frame
ratios, fit classification, or margins. Unit and browser tests compare those
values before and after zoom.

Grid spacing and the scale bar use deterministic 1, 2, or 5 multiples of powers
of ten. Labels change between degrees, arcminutes, and arcseconds without
feeding formatted values back into geometry.

## Assets and accessibility

The six local SVG illustrations under public/targets/ are original Astrotools
assets licensed as CC BY 4.0. Seed validation requires a safe local target path,
credit, and HTTPS licence URL together. Before opening a database transaction,
the seed process parser-validates every declared SVG against a static allowlist;
it rejects declarations, scripts, animation, unknown markup, and unsafe resource
references. Adversarial repository tests lock that policy.

The target scientific source covers the catalogue angular extent and its
orientation reference. SIMBAD records major axis, minor axis, and position angle
for M31 and M42. The Rosette reference instead supplies a north-up, east-left
126 × 115 arcminute image frame, not a measured boundary of the nebula. Its
catalogue record and simulator therefore expose that size as a qualified
planning proxy, represented by a 90° position angle. Circular or equal-axis
footprints are geometrically invariant under their stored position angle.

The SVG has a programmatic title and full description. A visible semantic
description list repeats the target extent, displayed field, orientation,
rotation, fit result, zoom disclaimer, grid, scale, licence, scientific source,
and verification date. Fit is always stated in text and never conveyed by colour
alone. Framing controls precede the graphic in DOM order and use native range
and radio semantics.

On screens at least 1100 CSS pixels wide, the framing controls sit alongside the
diagram so a slider can be adjusted while its visual effect remains in view. The
DOM and keyboard order remain controls, fit result, then graphic; the layout
returns to that vertical order below the desktop breakpoint.

At 1500 CSS pixels and wider, the calculator places the live imaging results and
equations in a column to the right of the simulator. This uses wide desktop
space for changing numerical and formula feedback without changing the document
or keyboard order. The intro and setup summary also compact at that breakpoint,
leaving more of the changing workspace in the initial desktop viewport.
