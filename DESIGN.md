---
name: Surat Dinas Minahasa Selatan
description: Sistem Informasi Manajemen Persuratan Dinas Pertanian
colors:
  forest-green: "#2A7356"
  forest-green-dark: "#215D45"
  forest-green-light: "#E6EFEA"
  harvest-gold: "#E6B044"
  harvest-gold-dark: "#CF9932"
  harvest-gold-light: "#FCF7ED"
  earthy-canvas: "#F7F7F4"
  earthy-ink: "#242E2A"
typography:
  display:
    fontFamily: "'Bricolage Grotesque', 'DM Sans', sans-serif"
    fontWeight: 700
  headline:
    fontFamily: "'Bricolage Grotesque', 'DM Sans', sans-serif"
    fontWeight: 600
  title:
    fontFamily: "'Bricolage Grotesque', 'DM Sans', sans-serif"
    fontWeight: 600
  body:
    fontFamily: "'DM Sans', sans-serif"
    fontWeight: 400
  label:
    fontFamily: "'DM Sans', sans-serif"
    fontWeight: 500
  print-body:
    fontFamily: "'Times New Roman', Times, serif"
    fontWeight: 400
  print-mono:
    fontFamily: "'Courier New', monospace"
    fontWeight: 400
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.forest-green}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.forest-green-dark}"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "20px 24px"
---

# Design System: Surat Dinas Minahasa Selatan

## Overview

**Creative North Star: "The Modern Bureaucrat"**

Calm, authoritative, and highly structured. A digital extension of official paperwork without the clutter. It is efficient, clear, and respects the hierarchy of government workflows. The system translates physical disposition sheets into a precise digital format, replacing ambiguity with strict tracking and grounded aesthetics.

**Key Characteristics:**
- Uncompromising clarity and hierarchy.
- Grounded, official color palette (Forest Green and Harvest Gold).
- Flat-by-default surfaces with structural borders.
- Tactile and confident interactive elements.

## Colors

Deep Forest Green and Harvest Gold reflect a refined, grounded, and official character.

### Primary
- **Forest Green** (#2A7356): Used for primary actions, branding elements, and active states. Asserts authority and success.

### Secondary
- **Harvest Gold** (#E6B044): Used for warnings, highlights, and secondary accents. Provides a warm contrast to the green.

### Neutral
- **Earthy Canvas** (#F7F7F4): The primary app background. A warm, paper-like off-white that reduces eye strain compared to pure white.
- **Earthy Ink** (#242E2A): Primary text color. Softer than pure black for prolonged reading.

### Named Rules
**The One Voice Rule.** The primary green is reserved for primary actions, active navigation states, and key highlights. It should not be overused as a background.

## Typography

**Display Font:** 'Bricolage Grotesque' (with 'DM Sans', sans-serif)
**Body Font:** 'DM Sans' (with sans-serif)

**Character:** A pairing of a characterful, structured grotesque for headings and a highly legible geometric sans for data and body copy.

### Hierarchy
- **Display** (800, 32px, 1.1): Page headers and major sections.
- **Headline** (600, 16px, 1.2): Card titles and modal headers.
- **Title** (600, 15px, 1.2): Sidebar headers and component titles.
- **Body** (400, 14px, 1.6): Main content, paragraphs, and descriptions.
- **Label** (600, 13px, 1.2): Table headers, small badges, and form labels.

### Print Layout (Kartu Disposisi)
- **Print Body** ('Times New Roman', 400, 13px): Matches the official physical A4 layout constraints exactly.
- **Print Mono** ('Courier New', 400): Used for strict archival stamps and reference codes within the paper layout.

### Named Rules
**The Bureaucratic Legibility Rule.** Data tables and form labels must use the label weight (600) to ensure scanability, while input data remains regular weight (400) to distinguish structure from content.

## Layout

A fixed sidebar layout (`280px` width) with a top navigation bar (`72px` height). The main content area uses generous padding (`24px 32px`) to frame the work. Data is predominantly structured in grids (e.g., stats grid with `16px` gap) and responsive tables.

## Elevation & Depth

Minimalist and editorial. The system relies on tonal layering and strict borders rather than ambient shadows.

### Shadow Vocabulary
- **shadow-md** (`0 4px 12px rgba(36, 46, 42, 0.03)`): Slight lift for hover states on stat cards.
- **shadow-glass** (`0 8px 32px rgba(0, 0, 0, 0.05)`): Reserved for modals, dropdowns, and floating elements.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest, defined by a 1px border. Shadows appear only as a response to state (hover, elevation, focus) for a minimalist/editorial feel.

## Shapes

Tactile, defined, and contained. The system uses a progressive border-radius scale (from `4px` for small elements up to `16px` for large containers) combined with crisp `1px` borders (`--border-color`) to delineate sections.

## Components

Tactile and confident, clearly distinguishing structural borders from actionable elements.

### Buttons
- **Shape:** Medium radius (8px).
- **Primary:** Forest Green background with white text, 10px 20px padding.
- **Hover / Focus:** Transitions to darker Forest Green, slightly scales down on active (`transform: scale(0.97)`).
- **Secondary:** Gray-100 background with text color and border.

### Cards / Containers
- **Corner Style:** Large radius (12px).
- **Background:** White (`#ffffff`) on the Earthy Canvas background.
- **Shadow Strategy:** Flat with a `1px` border at rest.
- **Internal Padding:** 20px 24px for headers and bodies.

### Inputs / Fields
- **Style:** 1.5px solid border, white background, 8px radius.
- **Focus:** Border shifts to primary text color (Earthy Ink) to confidently indicate focus without glowing.

### Badges
- **Style:** Pill-shaped (100px radius), small bold text (12px, 600 weight).
- **State:** Utilizes the semantic color scale (success, warning, danger, info) on light backgrounds.

## Do's and Don'ts

### Do:
- **Do** use the strict border system to separate content regions.
- **Do** reserve Harvest Gold for items requiring attention or warnings.

### Don't:
- **Don't** use pure black (`#000000`) for text; stick to Earthy Ink.
- **Don't** apply ambient drop shadows to cards at rest.
