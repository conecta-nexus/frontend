---
name: Conecta Nexus Design System
description: Institutional neo-brutalist design system connecting UFPS systems engineering students with regional industry challenges.
colors:
  primary: "#bc0017"
  primary-hover: "#a30014"
  neutral-bg: "#f7f2ee"
  neutral-surface: "#ffffff"
  neutral-text: "#191c21"
  neutral-muted: "#595d62"
  accent-coral: "#f3c5ba"
  accent-blue: "#e8effd"
  accent-mint: "#d7f5e8"
  accent-peach: "#fde4cf"
  border-stroke: "#191c21"
typography:
  display:
    fontFamily: "Uncut Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4.25rem)"
    fontWeight: 900
    lineHeight: "1.08"
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Uncut Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)"
    fontWeight: 900
    lineHeight: "1.15"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Uncut Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: "1.3"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Uncut Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: "1.6"
    letterSpacing: "normal"
  label:
    fontFamily: "Uncut Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 900
    lineHeight: "1.2"
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "36px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.xl}"
    padding: "14px 28px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.xl}"
    padding: "14px 28px"
  card-container:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.xl}"
    padding: "24px 32px"
  input-field:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
---

# Design System: Conecta Nexus

## Overview

**Creative North Star: "The Academic Launchpad"**

Conecta Nexus marries the institutional authority of Universidad Francisco de Paula Santander with a fresh, tactile, Meeko-inspired neo-brutalist aesthetic. It breaks cleanly away from sterile, bureaucratic academic administration systems, presenting an energetic, high-contrast digital campus that feels as dynamic as a modern venture lab or creative studio.

The interface prioritizes immediate comprehension and decisive action. High-density information (academic requirements, company verification, Colombian data protection compliance) is delivered through bold typography, stark solid borders, playful pastel stickers, and tactile physical offsets rather than faint gradients or corporate minimalism.

**Key Characteristics:**
- **Tactile Neo-Brutalism:** Solid 2px ink borders with flat, unapologetic hard-drop shadows (`3px` to `6px` offsets with zero blur radius).
- **Institutional Anchor:** Official UFPS Crimson Red (`#bc0017`) as the single high-potency accent on brand marks, primary actions, and critical state indicators.
- **Harmonious Pastel Accents:** Soft coral, ice blue, mint, and peach surfaces that soften industrial lines and delineate roles (Blue for Students, Coral for PYMEs).
- **Uncompromising Legibility:** Bold geometry powered by self-hosted Uncut Sans across display headings, interactive tabs, form controls, and body copy.

## Colors

A high-contrast institutional neo-brutalist palette anchored by university crimson, balanced by warm cream backgrounds and distinct pastel utility blocks.

### Primary
- **UFPS Crimson Red** (`#bc0017`): The definitive institutional voice. Reserved for the Conecta Nexus brand mark, primary submission buttons, selected focus rings, and high-impact hero accents. Never used as large background washes.
- **UFPS Crimson Dark / Hover** (`#a30014`): Direct interaction state for primary buttons and high-contrast badges.

### Secondary
- **Pastel Coral** (`#f3c5ba`): Dedicated corporate identity accent representing local PYMEs, industry challenges, and regional business enablement.
- **Pastel Ice Blue** (`#e8effd`): Dedicated student identity accent representing university engineering curriculum, student badges, and academic cohorts.

### Tertiary
- **Pastel Mint** (`#d7f5e8`): Technological success, verified data states, and engineering stickers (Cloud, Code, Software).
- **Pastel Peach** (`#fde4cf`): Informational highlights, callouts, and secondary landing badges.

### Neutral
- **Cream Canvas** (`#f7f2ee`): Warm, paper-like background that eliminates eye strain while establishing an organic, non-clinical environment.
- **Clean Surface** (`#ffffff`): Card containers, modal sheets, and capsule navigation surfaces.
- **Deep Ink Text** (`#191c21`): High-contrast headline and body text ensuring full WCAG 2.1 AA readability.
- **Muted Slate** (`#595d62`): Secondary helper text, subtitles, and metadata.
- **Dark Canvas** (`#0f1218`): Deep obsidian base canvas for Dark Mode.
- **Dark Surface** (`#171b23`): Dark theme card surfaces and input containers.

### Named Rules
**The 10% Crimson Rule.** Institutional Red (`#bc0017`) is an intentional lightning rod. It covers ≤10% of any viewport so that primary calls-to-action and institutional badges remain unmistakable.

**The Role Chromatic Anchor Rule.** Estudiantes UFPS always associate with Ice Blue (`#e8effd`); Empresas / PYMEs always associate with Pastel Coral (`#f3c5ba`). This chromatic distinction must remain invariant across authentication, dashboard views, and challenge applications.

## Typography

**Display Font:** Uncut Sans (self-hosted, geometric sans-serif)  
**Body Font:** Uncut Sans (with system-ui / sans-serif fallbacks)  
**Character:** Unapologetically confident, geometric, and contemporary. Tight tracking on big bold titles paired with generous line-height on instructional text.

### Hierarchy
- **Display** (Weight: 900 / Black, Size: `clamp(2.5rem, 6vw, 4.25rem)`, Line-height: `1.08`, Letter-spacing: `-0.03em`): Hero headlines and major portal declarations.
- **Headline** (Weight: 900 / Black, Size: `clamp(1.75rem, 3.5vw, 2.5rem)`, Line-height: `1.15`, Letter-spacing: `-0.02em`): Section anchors and authentication split headers.
- **Title** (Weight: 800 / ExtraBold, Size: `1.25rem` / `20px`, Line-height: `1.3`, Letter-spacing: `-0.01em`): Card headings, role selectors, and modal titles.
- **Body** (Weight: 500 / Medium, Size: `1rem` / `16px`, Line-height: `1.6`, Letter-spacing: `normal`): Form explanations, challenge summaries, and legal policies. Max line length: 65–75ch.
- **Label** (Weight: 900 / Black, Size: `0.875rem` / `14px`, Line-height: `1.2`, Letter-spacing: `0.05em`, Uppercase): Input field labels, badge tickers, button text, and metadata keys.

### Named Rules
**The Hard-Case Rule.** Form labels, role badges, and primary action triggers use bold uppercase text with positive tracking (`letter-spacing: 0.05em`) to eliminate ambiguity.

## Layout

A spatial rhythm governed by high-impact horizontal containers, capsule navigation, and responsive 50/50 split views.

- **Maximum Canvas Width:** `1480px` for top-level navigation capsules; `1360px` for hero sections; `1400px` for authentication splits.
- **Grid Architecture:** 12-column modular grid for landing page content; balanced 2-column split (1:1 ratio) on desktop displays for authentication portals (`/auth/login` and `/auth/register`).
- **Responsive Stack:** Large multi-column sections collapse cleanly to a single-column sequence on mobile screens (`< 1024px`), placing key instructional context above input forms.
- **Spatial Rhythm:** Multiples of `8px` (`8px`, `16px`, `24px`, `32px`, `48px`, `64px`).

## Elevation & Depth

Conecta Nexus rejects blurry ambient drop shadows in favor of tactile physical depth inspired by retro print design and architectural drafting.

### Shadow Vocabulary
- **Hard Border Base:** `border: 2px solid #191c21` (Light) or `border: 2px solid #374151` (Dark).
- **Physical Offset Shadow:** Flat solid shadow with zero blur.
  - Small elements / Badges: `box-shadow: 3px 3px 0px 0px rgba(0, 0, 0, 1)`
  - Cards & Containers: `box-shadow: 4px 4px 0px 0px rgba(0, 0, 0, 1)`
  - Form & Interactive Units: `box-shadow: 6px 6px 0px 0px rgba(0, 0, 0, 1)`
- **Hover Physics:** Interactive elements translate by `-2px` on both X/Y axes and expand shadow offset by `+2px`, generating an authentic pressable spring feel.

### Named Rules
**The Zero-Blur Doctrine.** Drop shadows have `0px` blur radius at all times. Depth is conveyed exclusively through crisp offset geometry.

## Shapes

- **Capsule Contours:** Floating navigation bar, primary category pills, and role tags use full capsule rounding (`border-radius: 9999px`).
- **Container Geometry:** Major cards, forms, and dialogs use smooth rounded rectangles (`border-radius: 16px` to `border-radius: 24px`) reinforced by 2px solid structural borders.
- **Interactive Controls:** Input fields and buttons use `12px` to `16px` rounding for balanced ergonomics.

## Components

### Buttons
- **Shape:** Rounded rectangle (`rounded-2xl` / `16px`) or capsule pill (`rounded-full` / `9999px`).
- **Primary:** Background `var(--color-institutional)`, text `#ffffff`, uppercase bold, 2px dark border with `4px 4px 0px 0px rgba(0,0,0,1)` shadow.
- **Hover / Active:** Translates to `translate-y-[-2px]` with shadow expansion on hover; compresses to `translate-y-[2px]` on active press.
- **Ghost / Neutral:** Light background (`#ffffff` or transparent), dark border, bold text with hover background shift to pastel coral or ice blue.

### Role Tabs (Dual-Role Switcher)
- **Shape:** Rounded container (`rounded-2xl` / `16px`) wrapping segmented tab triggers (`rounded-xl` / `12px`).
- **Active Student:** Background `#e8effd` (Ice Blue), 2px dark border, hard shadow `3px 3px 0px 0px rgba(0,0,0,1)`.
- **Active Company:** Background `#f3c5ba` (Pastel Coral), 2px dark border, hard shadow `3px 3px 0px 0px rgba(0,0,0,1)`.
- **Inactive:** Transparent border, muted slate text, clear hover transition.

### Input Fields
- **Style:** Light canvas background (`#f7f2ee`), 2px dark border, `rounded-2xl` (`16px`), padding `12px 16px`, bold placeholder text.
- **Focus:** Crisp focus ring tinted with institutional red (`ring-2 ring-institutional-500`), without blurry halos.
- **Error:** Red border (`border-red-500`), red helper text (`text-red-600`), and accessible `role="alert"` announcements.

### Navigation Capsule
- **Style:** Centered horizontal bar, `max-w-[1480px]`, `rounded-3xl` (`24px`), 2px dark border with `shadow-sm`.
- **Brand Mark:** "Conecta Nexus" with black wordmark, institutional red accent, and animated pulsing dot.
- **Links:** Bold Uncut Sans links with animated underline expander on hover.

### Floating Stickers (Organic Badges)
- **Style:** Hand-drawn SVG doodles and pastel pills rotated between `-8deg` and `+8deg`.
- **Motion:** Gentle undulating CSS keyframe animations (`float-gentle`, `float-reverse`, `float-slow`, `twinkle-star`) with complete fallback under `prefers-reduced-motion: reduce`.

## Do's and Don'ts

### Do:
- **Do** use exact 2px dark ink borders (`#191c21` or `#262626`) on all cards, inputs, and interactive surfaces.
- **Do** keep drop shadows solid with `0px` blur (`box-shadow: 4px 4px 0px 0px rgba(0,0,0,1)`).
- **Do** maintain the 50/50 split on desktop authentication pages to preserve visual balance.
- **Do** enforce institutional student domain validation (`@ufps.edu.co`) and corporate NIT formats.
- **Do** keep all end-user UI copy strictly in Spanish while preserving English in code symbols.

### Don't:
- **Don't** use faint pastel gradients or blurry shadows (`box-shadow: 0 10px 25px rgba(...)`) that dilute the neo-brutalist character.
- **Don't** use generic stock photos or corporate "handshake" clipart; rely on technical doodles, authentic stickers, and bold typography.
- **Don't** use UFPS Crimson Red (`#bc0017`) as full-page background washes; its rarity preserves its potency.
- **Don't** bypass Colombian Habeas Data (Ley 1581) consent dialogs on student or company registration flows.
