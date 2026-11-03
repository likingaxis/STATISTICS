---
name: "Statistics Homeworks"
description: "A sober academic notebook with charcoal and warm-paper modes, crimson controls and real mathematical evidence."
colors:
  accent-solid: "#df2531"
  accent-hover: "#a71624"
  inverse: "#fff6f6"
  inverse-muted: "#f7c9ce"
  button-ink: "#ffffff"
  dark-paper: "#151416"
  dark-surface: "#1d1c1f"
  dark-surface-soft: "#242226"
  dark-surface-hover: "#30272b"
  dark-ink: "#f4eeee"
  dark-text: "#d0c8ca"
  dark-muted: "#aaa0a4"
  dark-line: "#393236"
  dark-line-strong: "#6d5b63"
  dark-accent: "#ff737c"
  dark-accent-soft: "#351d23"
  dark-series-main: "#f47782"
  dark-series-reference: "#7bc6bd"
  dark-series-third: "#a8b8ef"
  dark-point-muted: "#9c8a92"
  dark-grid: "#6d5b63"
  dark-selection: "#70232e"
  dark-selection-ink: "#fff4f5"
  dark-success: "#96d0b2"
  dark-success-bg: "#20352a"
  dark-warning: "#e3c39c"
  dark-warning-bg: "#33291e"
  dark-warning-line: "#766044"
  dark-error: "#ff959c"
  dark-shadow-color: "#00000038"
  dark-glass: "#1d1c1fe8"
  light-paper: "#f8f6f5"
  light-surface: "#fffdfc"
  light-surface-soft: "#f0ebea"
  light-surface-hover: "#eee1e3"
  light-ink: "#292326"
  light-text: "#554b50"
  light-muted: "#71636b"
  light-line: "#ded4d6"
  light-line-strong: "#a58b93"
  light-accent: "#b91f2e"
  light-accent-soft: "#f8e5e7"
  light-series-main: "#be2637"
  light-series-reference: "#286e68"
  light-series-third: "#5369a5"
  light-point-muted: "#9d8790"
  light-grid: "#c7b7be"
  light-selection: "#f4c3ca"
  light-selection-ink: "#52121d"
  light-success: "#2d684d"
  light-success-bg: "#e7f1e9"
  light-warning: "#765025"
  light-warning-bg: "#f6eddf"
  light-warning-line: "#d8bf9c"
  light-error: "#a3182c"
  light-shadow-color: "#39151e12"
  light-glass: "#fffdfce8"
typography:
  home-display:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "clamp(65px, 6.4vw, 92px)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-2px"
  chapter-display:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "clamp(48px, 5.5vw, 76px)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-2px"
  headline:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "37px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.4px"
  chapter-title:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "35px"
    fontWeight: 400
    lineHeight: 1.12
  panel-title:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 550
    lineHeight: 1.4
  body:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "14px"
    lineHeight: 1.85
  button:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.4
  section-index:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "10px"
    letterSpacing: ".5px"
  code:
    fontFamily: "Consolas, monospace"
    fontSize: "13px"
    lineHeight: 1.9
rounded:
  field: "8px"
  panel: "12px"
  figure: "16px"
  secondary: "20px"
  primary: "24px"
  flat: "0"
spacing:
  field: "10px 11px"
  primary: "13px 21px"
  panel: "23px"
  formula: "28px 32px"
  section: "47px 0"
  chapter-gap: "0 32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-solid}"
    textColor: "{colors.button-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.primary}"
    padding: "{spacing.primary}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary-dark:
    backgroundColor: "transparent"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.secondary}"
    padding: "10px 14px"
  button-secondary-light:
    backgroundColor: "transparent"
    textColor: "{colors.light-text}"
    rounded: "{rounded.secondary}"
    padding: "10px 14px"
  panel-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  panel-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  field-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.field}"
    padding: "{spacing.field}"
  field-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.field}"
    padding: "{spacing.field}"
---

# Design System: Statistics Homeworks

## Overview

**Creative North Star: "The Academic Notebook"**

A sober academic notebook: serif chapter openings, restrained sans-serif reading, neutral scientific panels and a flat ruled chapter index. The reference-guided finish uses crimson for actions and orientation while preserving the established academic identity and concept → experiment → measurement → interpretation sequence.

Charcoal is the default; warm-paper light mode is an equally supported, saved alternative. Mathematical figures carry evidence rather than decoration. Interactions acknowledge a deliberate action, then settle.

**Key Characteristics:**

- Locally hosted serif display and DM Sans reading.
- Two coordinated appearances with semantic data colors.
- Ruled chapter navigation and neutral experiment surfaces.
- Brief state feedback with a static reduced-motion alternative.

## Colors

The frontmatter is normative. Keys prefixed `dark-` and `light-` are the corresponding values of the CSS property without that prefix; shared keys keep the same value in both modes. Runtime components use the semantic CSS properties so they change together.

### Primary

Crimson `accent-solid` fills primary buttons; `accent-hover` provides their darker hover. Theme-specific `accent` supplies links, current navigation, focus, selected controls and display emphasis. `accent-soft` is the supporting tint. White `button-ink` remains on primary buttons.

### Secondary

`series-main` is the crimson main series; `series-reference` is the teal comparison/reference series. Keep those roles across plots, expected lines, reference labels and corresponding legends. The historical CSS names `green` and `orange` are compatibility hooks, not palette instructions.

### Tertiary

`series-third` is the blue third series, including its matching legend marker. Success, warning and error tokens communicate result states, independently of data-series identity.

### Neutral

`paper` is the page canvas; `surface` holds scientific panels and fields; `surface-soft` groups formulas and metrics. `ink`, `text` and `muted` form the reading hierarchy. `line`, `line-strong` and `grid` separate content without heavy depth. Selection, status backgrounds and the translucent navigation `glass` each have mode-specific values.

The finite-field point plot has an explicit role exception: ordinary curve points use `point-muted`, base G and visited points use `ink`, and the current result uses `accent`. Its legend mirrors those exact assignments, rather than borrowing the statistical main/reference roles.

**The Series Agreement Rule.** A series and its legend use the same semantic token in both appearances; line style and labels distinguish measured data from model references.

## Typography

Use locally hosted Libre Caslon Display with Georgia fallback for display headings, chapter titles and large formulas. Use locally hosted DM Sans with Arial fallback for reading, controls and scientific labels. Consolas/monospace is for encodings, coordinates and code.

The frontmatter records the desktop hierarchy. The home display scales fluidly; at the narrow breakpoint it uses `clamp(58px,15vw,74px)` and line-height 1, with a 52px adjustment at 360px. Chapter display uses `clamp(42px,11.3vw,60px)` on narrow screens. Section headings reduce to 33px; chapter-index titles become 36px. Paragraphs have a maximum of 75ch; the Welford reading block allows 76ch. Tables and metric groups use tabular numerals.

Section numbers and descriptive metadata sit below the relevant heading. Existing course and assignment labels are content context, not a template for new promotional kickers.

## Layout

Center the reading area in a 1320px container with 60px horizontal padding; the large-screen container becomes 1380px at 1450px. Padding reduces to 35px at 1100px and 22px at 760px. The home opening pairs prose with a mathematical figure, followed by academic context and a two-column ruled chapter index. Chapter introductions have a 960px maximum.

The main scientific layout uses two columns or a control/plot/result grid, collapsing in stages at 1100px and 760px. The index and home opening become one column at 760px. Tables, code and scientific charts scroll inside their containers. Keep surrounding prose within the viewport.

Navigation is sticky. At 1250px and below it places horizontally scrolling chapter links on a second row; the theme switch stays beside the identity. Preserve the five exact homework routes `#hw1`–`#hw5`, plus overview and references, through appearance changes.

## Elevation & Depth

Flat tonal layering and fine borders supply depth. The navigation alone has a smoked translucent surface and a 16px backdrop blur. The mathematical figure uses a neutral surface; its supporting note is unrotated and has no shadow. The chapter index is transparent and ruled rather than a raised card grid.

**The Quiet Surface Rule.** Use rules and neutral surface contrast for structure; keep the chapter index flat and reserve crimson emphasis for actions, orientation and meaningful data.

## Shapes

The frontmatter owns the radius values: gently rounded scientific panels, slightly smaller fields, a larger figure frame and pill-shaped action controls. The chapter index has square, open edges with a top rule. Circular point markers represent mathematical/data roles. Avoid imposing one universal card shape on every region.

## Components

### Buttons

Primary controls use shared solid crimson, white text and the primary padding/radius tokens. Hover darkens the fill; pressed state scales to .98. Arrow spans move slightly on hover. A single reflected-light pass crosses the button on deliberate hover; it never runs unattended. Secondary and icon controls use transparent backgrounds, neutral text and a subtle hover surface. Disabled buttons use .5 opacity and a not-allowed cursor.

All interactive elements retain a visible accent outline (3px, offset 4px). Reduced motion removes transitions and animations while preserving color, outline, pressed and disabled state feedback.

### Navigation and appearance

The desktop navigation is 86px tall, uses small sans-serif labels and marks the current route with accent text and a 2px rule. The appearance button has an inline SVG icon, visible Dark/Light state, track and accessible action label/pressed state. Save the choice under `statistics-theme`, apply it before first paint and synchronize storage changes. Dark is the fallback if storage is unavailable.

Use the native view-transition crossfade when supported and reduced motion is not requested: 140ms old-view fade and 240ms new-view fade. Otherwise apply appearance immediately; do not animate geometry.

### Chapter index

Each chapter is a full linked entry with a thin top rule, accent homework number, muted subject tag, serif title, explanation and footer link. Hover colors the rule/title and moves the footer arrow slightly. All five entries share the same treatment; older `dark` classes do not create a saturated alternate card.

### Scientific panels, metrics and fields

Panels use `surface`, a `line` border and panel padding; formulas and metrics use `surface-soft`. Formulas retain readable `ink`. Fields use the matching surface, line and text tokens; textareas retain their multiline reading rhythm. Label inputs explicitly and preserve the existing validation/loading/cancellation messages. Charts display computed results with the semantic colors above; legends must match.

### Tags and section navigation

Subject/status tags use compact sans-serif type and neutral borders where present. Chapter-index subject tags are borderless and muted. Local chapter navigation wraps naturally, with ruled boundaries and accent hover. Section metadata is a subordinate line below the title.

## Do's and Don'ts

### Do:

- Do support both saved appearances on every chapter.
- Do preserve English content, academic identity and the concept → experiment → measurement → interpretation sequence.
- Do use semantic series tokens for plots and matching legends.
- Do put section metadata below its heading and preserve readable scientific labels.
- Do keep visible keyboard focus, local chart/table scrolling and static reduced-motion feedback.

### Don't:

- Don't introduce a new font pairing or a separate identity for another homework.
- Don't turn scientific panels into saturated promotional cards.
- Don't use a decorative curve in place of computed mathematical data.
- Don't add unattended looping animation or make a theme change move the page layout.
