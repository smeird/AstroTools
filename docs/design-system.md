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

## Responsive shell

At desktop widths, a fixed control rail sits beside the primary result,
visualisation, and detailed results. Below 900 CSS pixels the same DOM becomes a
single column in this reading order:

1. controls;
2. compact primary result;
3. visualisation and its text alternative;
4. detailed results.

The Work Package 2 visualisation is deterministic and explicitly illustrative.
It does not claim calibrated target scale; target assets and proportional target
framing remain Work Package 5.
