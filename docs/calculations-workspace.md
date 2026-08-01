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
on page-level horizontal scrolling. Printing swaps the interactive workspace for
the separate ordered report described below.

When the shared train has a rig name, the page heading and document title use
it. The **Export ordered PDF** control calls the browser's native Save-as-PDF
workflow, but the print tree is not a printout of the interactive workspace. It
is a separate ordered report with a rig heading, equipment specification,
numbered calculation chapters, model classes, values and units, explicit missing
measurements, and a final method note. Interactive navigation and screen cards
are excluded. No PDF or equipment data is uploaded to a third party.
