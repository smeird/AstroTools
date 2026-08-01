# Consolidated Calculations and Academic View

- Status: Work Package 22
- Canonical route: `/calculations`

The calculations workspace reads the versioned full imaging train published by
the equipment page. It uses the same pure calculation functions as detail pages
and groups all eleven calculators into dense, semantic result tables. Values
that need calculator-specific measurements remain unavailable until those
measurements have been saved; the overview does not invent inputs.

The site header provides a persistent Presentation/Academic switch. Presentation
view retains the established visual hierarchy. Academic view reduces spacing,
decoration and heading scale while increasing table density across the site. The
preference is local presentation state, is not included in equipment URLs, and
cannot alter inputs or numerical output.

Tables have labelled, locally scrollable regions and the document never relies
on page-level horizontal scrolling. Print styles remove navigation and render a
compact two-column reference sheet where the page width permits it.

When the shared train has a rig name, the page heading and document title use
it. The **Export PDF** control calls the browser's native print workflow: users
choose Save as PDF (or a physical printer) using their browser and
operating-system dialog. The dedicated A4 landscape stylesheet removes
interactive navigation, uses black-on-white tables, preserves the rig and train
context, and avoids splitting individual result sections where the browser can
honour it. No PDF or equipment data is uploaded to a third party.
