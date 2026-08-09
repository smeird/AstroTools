# Bookmarkable Equipment Workspace

- Status: Work Package 15
- Canonical route: `/equipment`

The equipment workspace is the equipment-first entry point to Astrotools. Its
versioned URL contains telescope, camera, optical modifier, and binning state,
including canonical numeric fallbacks for catalogue selections. It intentionally
excludes target choice, seeing, display units, framing rotation, orientation,
and display zoom because those belong to individual calculations or observing
sessions rather than the physical equipment bookmark.

The workspace writes the canonical URL into browser history after every valid
equipment change. “Copy equipment URL” copies that same address. Opening the URL
in a fresh browser reconstructs manual values as well as available, inactive, or
later-retired catalogue selections without requiring an account or server-side
profile.

The page is deliberately equipment-only. It shows a concise effective-train
check, while `/calculations` lists every implemented calculator, derived result,
and explicit missing measurement. Both routes consume the same locally published
full imaging train. A bare `/equipment` route may restore the last locally
remembered setup as a convenience; the URL remains the portable source of truth.

Calculator handoff is idempotent. Equipment-derived values are applied when the
published train changes and the applied marker is committed only after the
calculator state is persisted. Development-mode effect replay therefore cannot
replace inherited values with defaults, while a user's later specialist edits
remain intact when the same train is reopened.

Each detail calculator names the inherited fields. Optical and camera geometry
flow into Field of View, Modifier Effects, Resolution, Sensor Tilt, Guiding,
Polar Alignment, Exposure SNR, Mosaic, Dew Heater and Storage wherever the
equipment profile contains the required value. Back-focus remains
specialist-only because mechanical sensor depth and accessory thicknesses are
not part of the profile.

The optional rig name is canonical URL state (`n=`), limited to 80 normalised
plain-text characters. It becomes the equipment and calculations document title
so a browser bookmark is recognisable. It is also copied into the local shared
train; Astrotools does not send it to a profile or analytics service.

Optional observing-site context is canonical URL state too: Bortle class (`bo=`)
and an SQM reading in mag/arcsec² (`sqm=`). Both values travel with the shared
imaging train but remain independent observations; a Bortle category is not
presented as an exact conversion of an SQM measurement.

The Setup check includes a generated SVG train diagram. It renders the resolved
telescope, ordered modifier instances, camera and binning directly from the same
configuration used by the calculations. Its accessible description lists those
parts in optical order, and a horizontally constrained viewport protects narrow
screens when a train contains many modifiers.

Catalogue optical-design text selects a refractor, reflector or catadioptric
two-dimensional optical section. Manual scopes remain generic because shape is
never inferred from focal ratio alone. Flat linework identifies lenses, mirrors,
correctors, the sensor and two representative rays. A refractor converges rays
after its objective; a catadioptric path folds primary-to-secondary-to-rear
focus; and a reflector uses its mirror path. The diagram is explanatory rather
than a prescription for collimation or fabrication. The schematic and adjacent
fact table progressively expose aperture, native and effective focal properties,
modifier types and factors, sensor dimensions, resolution, pixel pitch, binning,
exact field and image scale only when each value is valid.

Other than the optional user-authored rig label and observing-site measurements,
the equipment URL contains no personal data, analytics identifier, secret, or
opaque lookup key. Clearing browser storage does not affect a bookmarked URL.
