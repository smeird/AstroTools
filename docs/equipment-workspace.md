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

The overview lists every implemented calculator. It shows equipment-derived
results immediately and explicitly identifies calculations that still need a
measurement or calculator-specific input. Detail links use the same pure
calculation inputs and publish the shared telescope and camera locally before
navigation. A bare `/equipment` route may restore the last locally remembered
setup as a convenience; the URL remains the portable source of truth.

The equipment URL contains no personal data, analytics identifier, secret, or
opaque lookup key. Clearing browser storage does not affect a bookmarked URL.
