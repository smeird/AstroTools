# Shareable calculator state

- Status: Work Package 7 contract
- Schema version: 1
- Last reviewed: 30 July 2026

The Field of View Lab can reproduce a complete useful configuration from a URL
without an account or database write. The browser performs every calculation;
the server reads only bounded catalogue references needed to label presets and
retain reset behaviour.

## Version 1 schema

The canonical route is `/calculators/field-of-view`. Generated links use this
stable parameter order:

| Parameter  | Meaning                       | Accepted value                              |
| ---------- | ----------------------------- | ------------------------------------------- |
| `v`        | Schema version                | `1`                                         |
| `t`        | Telescope base                | catalogue slug or `_manual`                 |
| `tm`       | Telescope source mode         | `preset` or `manual`                        |
| `fm`       | Focal-length mode             | `direct` or `derived`                       |
| `f`        | Native focal length           | 10–20,000 mm                                |
| `a`        | Aperture                      | 5–2,000 mm                                  |
| `fr`       | Native focal ratio            | 0.005–4,000                                 |
| `c`        | Camera base                   | catalogue slug or `_manual`                 |
| `cm`       | Camera source mode            | `preset` or `manual`                        |
| `cg`       | Sensor geometry               | `physical-dimensions` or `pixel-resolution` |
| `sw`, `sh` | Sensor dimensions             | 0.1–1,000 mm                                |
| `px`       | Native pixel pitch            | 0.1–100 µm                                  |
| `rw`, `rh` | Sensor resolution             | integer 1–200,000 px                        |
| `m`        | Ordered optical modifier      | repeated entry described below, maximum 8   |
| `b`        | Binning or effective grouping | `1`, `2`, `3`, or `4`                       |
| `s`        | Stated seeing                 | 0.5–10 arcseconds                           |
| `target`   | Astronomical target           | catalogue slug                              |
| `unit`     | Physical display unit         | `millimetres` or `inches`                   |
| `zoom`     | Display-only zoom             | 0.5–4                                       |
| `rot`      | Frame rotation                | integer −180–180 degrees                    |
| `orient`   | Sensor orientation            | `landscape` or `portrait`                   |

Modifier order is significant. A preset entry is
`preset:<slug>:<type>:<multiplier>`; a manual entry is
`manual:manual:<type>:<multiplier>`. Supported manual types are `reducer`,
`field-flattener`, `barlow`, and `custom`. `URLSearchParams` performs all
encoding; application code never concatenates an unescaped URL.

`_manual` deliberately falls outside the catalogue-slug grammar, so a real
equipment record whose slug is `manual` remains unambiguous. Preset modifier
types are resolved from the catalogue; if a future catalogue type is not one of
the four manual types, its URL stores the compatibility token `custom` while
retaining the preset slug and exact multiplier.

Generated links include every valid semantically relevant current value,
including valid values retained behind the inactive camera geometry mode. An
invalid draft in an inactive geometry mode is omitted and restores from the
selected preset or contextual default; it does not mark the currently valid
preset as customised. Internal UUIDs, labels, manufacturer data, source URLs,
asset credits, focus state, results, and copy feedback are never included.
Direct mode treats focal length and aperture as authoritative and writes their
current derived ratio. Derived mode treats aperture and focal ratio as
authoritative and validates that their product remains inside the focal-length
boundary.

## Parsing and compatibility

- The bare route has no version requirement and opens the normal defaults.
- Recognised state without exactly one supported `v` restores the full default
  configuration and displays a static explanation.
- A valid partial v1 URL inherits omitted values from its selected preset or
  contextual default.
- Invalid recognised values fall back by field or section. A visible `role=note`
  names only safe field labels and never reflects raw query data.
- Unknown future parameters are ignored and are not copied into a new canonical
  link.
- Scalar duplicates are rejected; only `m` may repeat. Known value length, total
  query length, modifier count, numerical range, and integer requirements are
  bounded before state construction.
- The parser is resolved on the server and supplies the reducer's initial state.
  There is no default-state flash, effect-driven hydration, or network request
  when a control changes.

Catalogue lists intentionally expose active equipment. A valid shared link may
also request one telescope, one camera, and up to eight modifier slugs through
bounded detail reads. Detail reads include inactive records, preserving their
label, original baseline, customisation status, and Reset semantics. If a record
has been deleted or cannot be read, its canonical numerical values are retained
as manual configuration and the adjustment is explained. Target records do not
currently have an active flag and are all included in the catalogue read.

## Copy interaction

`Copy link` constructs an absolute canonical URL only after a user activates the
button. It updates the current address without navigation and writes the same
URL through the Clipboard API. Success and failure are reported through a
dedicated polite status while focus remains on the button. If clipboard access
is unavailable, the URL is exposed in a labelled, read-only, locally bounded
input for manual copying. An invalid current form keeps the button operable and
explains that required labelled fields must be corrected first.

The URL contains calculator state only. It contains no personal information,
secret, analytics identifier, or server-side short-link key.

## Remembered equipment across calculators

The current valid telescope is also stored locally as a small, versioned shared
selection containing its display label, optional catalogue slug, focal length,
and aperture. Resolution and Sampling and Reducer/Barlow apply a newly changed
telescope once, while retaining their own camera, seeing, wavelength, modifier,
and other calculator-specific settings. A manual edit made inside one of those
calculators is therefore preserved on reload until the user changes the shared
telescope again in Field of View.

Calculators that do not use telescope geometry may display the remembered
selection for continuity but do not apply it to unrelated inputs. The shared
selection remains in browser local storage; it is not sent to the server and is
not included in analytics or accounts.

## Compatibility fixtures

Manually authored v1 fixtures live in
`tests/fixtures/field-of-view-shareable-state-v1.ts`. They are deliberately not
generated by the serializer. Unit tests parse them, assert semantic state, and
compare canonical output so an accidental parameter or ordering change fails
review. End-to-end tests copy a complex current state, open it in a fresh
browser context, and compare controls, results, modifier order, and framing
geometry.
