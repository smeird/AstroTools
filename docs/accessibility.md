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

## Manual release checks still required

Automated evidence is not a screen-reader conformance claim. Before the Release
1 accessibility gate is signed off, record keyboard operation at 200% browser
zoom and at least one current VoiceOver/Safari or NVDA/Firefox session,
including the combobox, live result, invalid-field recovery, visualisation
equivalent, and result description list.
