# Design system

Work Package 2 establishes the first production visual and interaction layer. It
deliberately contains only primitives proven by the Field of View Lab; a generic
calculator registry or second-calculator abstraction is deferred until another
calculator requires one.

## Visual language

The system retains the demonstrator's observatory-dark surfaces, off-white
editorial typography, cyan measurement signals, and chartreuse decision accent.
All production values are named tokens in `app/globals.css`:

- semantic colours distinguish text, surfaces, interactive borders, focus,
  signals, and errors;
- body, editorial heading, and technical monospace font stacks have explicit
  roles;
- spacing, radius, minimum control size, and overlay shadow values are shared;
- the minimum interactive target is 44 by 44 CSS pixels;
- the decorative low-contrast border is never the sole boundary of an input.

CSS modules own component and feature styles. The small set of global classes is
limited to tokens, shared site chrome, homepage composition, and cross-cutting
focus, forced-colour, and reduced-motion rules.

## Controls

`components/design-system` contains controlled React primitives. Domain parsing,
bounding, and calculations stay in the feature or `lib/calculations`.

- `NumericInput` preserves the raw edit string and exposes linked description
  and error text.
- `RangeInput` uses the native range control and supplies a unit-aware
  `aria-valuetext`.
- `SegmentedControl` uses native radios in a fieldset, retaining browser Tab,
  arrow-key, and Space behaviour.
- `Combobox` follows the editable listbox pattern: DOM focus remains on the text
  input and Arrow keys, Enter, Escape, Tab, pointer selection, disabled options,
  and empty results are supported.
- `ResultGrid` and `ResultCard` render a semantic description list. Sampling
  status is always present in text rather than colour alone.

The Field of View Lab owns one polite, atomic live region for its compact
primary result. Detailed results are ordinary semantic content to avoid repeated
screen reader announcements.

## Equations

`components/equations` contains the first shared mathematical presentation
primitives. `MathExpression` places caller-supplied native MathML in a labelled,
keyboard-scrollable local viewport; overflowing expressions support explicit
ArrowLeft and ArrowRight scrolling across the supported engines. It never
converts a string into markup. `EquationCard` groups symbolic and substituted
expressions with visible prose, a semantic variable definition list, a final
result, and interpretation.

The MathML remains navigable content and is not replaced by an `aria-label`.
Ordinary visible “In words” text provides a dependable explanation alongside the
mathematical structure. Long expressions scroll only inside their own bounded
viewport, so 320 CSS-pixel layouts and 200% text enlargement do not create
page-level horizontal overflow.

The physical-unit segmented control sits with results rather than inside the
equipment hierarchy. It changes only physical result formatting and live
substitutions. Canonical millimetre inputs, preset customisation state,
calculation results, target geometry, and image sampling remain untouched.

## Responsive shell

At desktop widths, a fixed control rail sits beside the primary result,
visualisation, and detailed results. Below 900 CSS pixels the same DOM becomes a
single column in this reading order:

1. controls;
2. compact primary result;
3. visualisation and its text alternative;
4. detailed results.

The equations and interpretations follow the detailed results in the same
results region.

The visualisation remains deterministic and explicitly illustrative. Work
Package 5 adds an angularly proportional target footprint and sensor frame,
while its caption and text equivalent make clear that the artwork is not a
calibrated sky survey.

## Calculator technical figures

Every calculator starts with one compact explanatory figure from
`components/diagrams`. These are flat, unfilled two-dimensional schematics: cyan
identifies physical structure, chartreuse identifies a transformed path or
relationship, and visible labels carry the meaning independently of colour. They
explain the calculator's geometry or data flow and are not calibrated output
plots.

Each figure is a semantic `figure` with a visible heading and plain-language
caption. Its SVG is exposed as an image with the same calculator-specific title
and description, rather than as a collection of unnamed drawing primitives. The
shared component keeps this contract consistent across all calculator routes.
Academic view reduces the surrounding space without removing the caption; narrow
layouts place the caption above the drawing to avoid horizontal overflow.

## Equipment configuration

Work Package 4 applies the control primitives to the production input hierarchy:

1. telescope source and searchable preset;
2. direct native focal length, aperture, and related focal ratio;
3. an ordered optical-modifier chain;
4. camera source and searchable preset;
5. physical sensor dimensions or pixel-resolution derivation;
6. binning or effective pixel grouping;
7. seeing; and
8. astronomical target.

Direct focal length is the default. The separate derived mode visibly makes
aperture and focal ratio responsible for focal length; read-only calculated
fields remain keyboard-focusable so their value and explanation are available to
assistive technology.

Telescope and camera state each retain an immutable snapshot of the most
recently selected preset. Moving to manual mode preserves every current value,
customised presets are marked in text, and Restore returns to that snapshot
rather than an unrelated default rig. The same inputs remain usable when the
server reports that MySQL is unavailable.

Modifier presets may be added in optical-path order and visibly expose their
multiplier and compatibility notes. Manual modifiers cover reducers, flatteners,
Barlows, and custom factors not yet present in the curated catalogue. Every card
states whether its current multiplier changes effective focal length and focal
ratio. Customised catalogue multipliers can be restored to their own preset
baseline. The chain is bounded at eight entries so malformed or accidental
interaction cannot create unbounded work; removing or clearing entries returns
keyboard focus to a stable modifier control.

Target selection remains at the end of the equipment hierarchy. The framing
panel that follows it provides display-only zoom, frame rotation, and
landscape/portrait orientation before the graphic in DOM order. Those controls
alter only the pure framing geometry and never the optical calculation; frame
rotation and orientation can intentionally change the centred-fit assessment. A
semantic description list exposes the same target extent, position angle, field,
frame rotation, fit status, scale, source, and credit without requiring the
graphic. A concise target-and-fit message shares the existing polite result
status, while display-only zoom leaves that message unchanged.

## Presentation and Academic typography

Presentation view retains the editorial Georgia heading face and broad Arial
body text. Academic view switches the complete interface to a locally available,
normally proportioned technical sans-serif stack (`Aptos`, `Segoe UI`, then
Arial). Density comes from layout, sizing and spacing rather than a distorted or
overly narrow face. No webfont request, tracking service or layout-blocking
download is introduced. Headings gain a firmer technical weight while controls,
tables and ordinary text use the same readable family.

The current homepage reflects the equipment-first product architecture. Its two
primary routes are the named equipment workspace and consolidated calculation
dossier. The rig-flow figure explains shared context, the workflow explains
bookmark-to-PDF use, and a semantic three-group index links all eleven
specialist calculators without reverting to a tall unstructured action list.
