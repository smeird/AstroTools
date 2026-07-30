# Accessibility

Astrotools targets WCAG 2.2 AA. Every user-facing package must preserve semantic
landmarks, complete keyboard operation, visible focus, 44 by 44 CSS-pixel touch
targets, sufficient contrast, reduced-motion support, useful live-result
announcements, and non-visual equivalents for framing graphics.

Automated checks complement, but do not replace, the manual keyboard and
screen-reader evidence required by the implementation plan.

## Work Package 2 evidence

Evidence recorded on 29 July 2026:

- Vitest exercises the visible labels, linked descriptions and errors, raw
  numeric edits, range value text, native radio keyboard behaviour, editable
  combobox keyboard and pointer behaviour, semantic result cards, one scoped
  live region, and logical reading order.
- Playwright runs the production build in Chromium, Firefox, WebKit, Pixel 7,
  and iPhone 15 profiles. All 45 checks pass.
- `@axe-core/playwright` scans the default calculator, expanded combobox, and
  invalid numeric-field states against WCAG 2 A/AA, WCAG 2.1 A/AA, and WCAG 2.2
  AA tags. No serious or critical findings remain.
- Browser checks prove a complete keyboard journey through the reference
  controls, visible focus, 44 by 44 CSS-pixel minimum pointer targets, reduced
  motion, and no page-level overflow at 320 CSS pixels or after 200% text
  scaling.
- The in-app browser was used to inspect the 1440-pixel desktop and 390-pixel
  mobile compositions, operate the combobox, and inspect valid and invalid
  calculation states. The mobile page reported zero horizontal overflow.

The visualisation is labelled as illustrative and has a textual equivalent that
reports the current angular field. Sampling state is always written in text;
colour is supplementary.

## Work Package 4 evidence

Evidence recorded on 30 July 2026:

- Reducer and component tests cover the prescribed input order, labelled direct
  and derived focal-length modes, preset/manual transitions, textual
  customisation status, deterministic restore behaviour, unavailable-catalogue
  fallback, modifier limits, and read-only calculated inputs.
- Playwright exercises the real seeded MySQL catalogue rather than browser
  fixtures. It covers searchable equipment and target selection, an ordered
  reducer, complete manual override and restore journeys, binning, seeing, and
  proof that those interactions issue no XHR or Fetch requests. All 60 checks
  pass across Chromium, Firefox, WebKit, Pixel 7, and iPhone 15 profiles.
- Axe scans the configured page, an expanded combobox, a manual modifier, and an
  invalid numeric state. Serious and critical findings are release-blocking.
- Keyboard checks verify key milestones in the prescribed control hierarchy and
  operate the editable combobox and native radio patterns without a pointer.
  Dynamic modifier removal and clearing explicitly return focus to a stable
  control. The 44 by 44 CSS-pixel target, visible-focus, reduced-motion, 320
  CSS-pixel, and 200% content-zoom checks remain part of every supported browser
  profile.
- The in-app browser was used to inspect the server-rendered MySQL preset state,
  search and select a telescope, review the desktop composition, and operate a
  typed manual Barlow at a 375 CSS-pixel mobile viewport. The mobile document
  reported no horizontal overflow.

## Manual release checks still required

Automated evidence is not a screen-reader conformance claim. Before the Release
1 accessibility gate is signed off, record keyboard operation at 200% browser
zoom and at least one current VoiceOver/Safari or NVDA/Firefox session,
including the combobox, live result, invalid-field recovery, visualisation
equivalent, and result description list.
